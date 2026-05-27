import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Chip, Divider, TextField,
  IconButton, CircularProgress, Alert, Avatar,
} from '@mui/material';
import { type Memorial, type AuthUser, type Comment, updateStory, deleteStory, toggleLike, getComments, postComment, deleteComment, reportStory } from '../../api';
import { validateContent } from '../../utils/contentFilter';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SendIcon from '@mui/icons-material/Send';
import FlagIcon from '@mui/icons-material/Flag';

interface MemorialDetailDialogProps {
  memorial: Memorial | null;
  onClose: () => void;
  currentUser: AuthUser | null;
  onUpdated: (memorial: Memorial) => void;
  onDeleted: (id: number) => void;
  onViewAuthorProfile: (authorName: string, authorId: number) => void;
}

export function MemorialDetailDialog({
  memorial, onClose, currentUser, onUpdated, onDeleted, onViewAuthorProfile,
}: MemorialDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ title: '', relationship: '', content: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editError, setEditError] = useState('');

  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState('');

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    if (!memorial) return;
    setLikeCount(memorial.likes);
    setLiked(memorial.user_liked);
    setIsEditing(false);
    setEditError('');
    setCommentError('');
    setCommentInput('');

    getComments(memorial.id).then(setComments).catch(() => {});
  }, [memorial]);

  if (!memorial) return null;

  const isAuthor = currentUser?.id === memorial.user_id;

  const handleEditClick = () => {
    setEditData({ title: memorial.title, relationship: memorial.relationship, content: memorial.content });
    setIsEditing(true);
  };

  const handleSubmitReport = async () => {
    if (!reportReason.trim()) return;
    setSubmittingReport(true);
    try {
      await reportStory(memorial.id, reportReason.trim());
      setReportSuccess(true);
      setReportReason('');
      setTimeout(() => { setReportDialogOpen(false); setReportSuccess(false); }, 2000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error submitting report');
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleSaveEdit = async () => {
    // Validation frontend (XSS + mots bannis locaux)
    for (const [field, value] of [['title', editData.title], ['content', editData.content]] as [string, string][]) {
      const check = validateContent(value);
      if (!check.isValid) { setEditError(check.message ?? `Invalid ${field}`); return; }
    }
    setSaving(true);
    setEditError('');
    try {
      const updated = await updateStory(memorial.id, editData);
      onUpdated(updated);
      setIsEditing(false);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Error saving');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this memorial permanently?')) return;
    setDeleting(true);
    try {
      await deleteStory(memorial.id);
      onDeleted(memorial.id);
    } catch {
      setDeleting(false);
    }
  };

  const handleLike = async () => {
    if (!currentUser || liking) return;
    setLiking(true);
    try {
      const result = await toggleLike(memorial.id);
      setLiked(result.liked);
      setLikeCount(result.likes);
    } finally {
      setLiking(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentInput.trim() || submittingComment) return;
    setSubmittingComment(true);
    setCommentError('');
    try {
      const comment = await postComment(memorial.id, commentInput.trim());
      setComments((prev) => [...prev, comment]);
      setCommentInput('');
    } catch (err: unknown) {
      setCommentError(err instanceof Error ? err.message : 'Error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    try {
      await deleteComment(memorial.id, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {}
  };

  return (
    <Dialog open={!!memorial} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FavoriteIcon sx={{ color: 'error.light' }} />
          <Typography variant="h5" component="span" sx={{ flex: 1 }}>
            {isEditing ? 'Edit Memorial' : memorial.title}
          </Typography>
          {isAuthor && !isEditing && (
            <>
              <IconButton onClick={handleEditClick} color="primary" size="small">
                <EditIcon />
              </IconButton>
              <IconButton onClick={handleDelete} color="error" size="small" disabled={deleting}>
                {deleting ? <CircularProgress size={18} /> : <DeleteIcon />}
              </IconButton>
            </>
          )}
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {isEditing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {editError && <Alert severity="error">{editError}</Alert>}
            <TextField fullWidth label="Name of loved one" value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              inputProps={{ maxLength: 100 }} />
            <TextField fullWidth label="Relationship" value={editData.relationship}
              onChange={(e) => setEditData({ ...editData, relationship: e.target.value })}
              inputProps={{ maxLength: 50 }} />
            <TextField fullWidth multiline rows={6} label="Their story" value={editData.content}
              onChange={(e) => setEditData({ ...editData, content: e.target.value })}
              inputProps={{ maxLength: 4000 }}
              helperText={`${editData.content.length} / 4000`} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip label={memorial.relationship} color="primary" variant="outlined" />
              <Box sx={{ flex: 1 }} />
              {currentUser && currentUser.id !== memorial.user_id && (
                <IconButton size="small" title="Report this post"
                  onClick={() => setReportDialogOpen(true)} color="default">
                  <FlagIcon sx={{ fontSize: 18 }} />
                </IconButton>
              )}
              <IconButton onClick={handleLike} disabled={!currentUser || liking}
                color={liked ? 'error' : 'default'} size="small">
                {liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
              </IconButton>
              <Typography variant="body2" color="text.secondary">{likeCount}</Typography>
            </Box>

            {memorial.image_path && (
              <Box sx={{ width: '100%', maxHeight: 300, borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                <img src={memorial.image_path} alt={memorial.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Box>
            )}

            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {memorial.content}
            </Typography>

            <Divider />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PersonIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  Shared by{' '}
                  <Button onClick={() => onViewAuthorProfile(memorial.author, memorial.user_id)}
                    sx={{ textTransform: 'none', p: 0, minWidth: 'auto', verticalAlign: 'baseline', textDecoration: 'underline' }}>
                    {memorial.author}
                  </Button>
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarTodayIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  {new Date(memorial.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Typography>
              </Box>
            </Box>

            <Divider />

            {/* Commentaires */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Comments ({comments.length})
              </Typography>

              {comments.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  No comments yet. Be the first!
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                  {comments.map((c) => (
                    <Box key={c.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
                      <Avatar sx={{ width: 32, height: 32, fontSize: 14, bgcolor: 'primary.main' }}>
                        {c.username.charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, bgcolor: 'grey.50', borderRadius: 2, px: 1.5, py: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="caption" fontWeight={600}>{c.username}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(c.created_at).toLocaleDateString()}
                          </Typography>
                          {(currentUser?.id === c.user_id || currentUser?.is_admin) && (
                            <IconButton size="small" sx={{ ml: 'auto', p: 0 }}
                              onClick={() => handleDeleteComment(c.id)}>
                              <DeleteIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          )}
                        </Box>
                        <Typography variant="body2">{c.content}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}

              {currentUser ? (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <TextField
                    fullWidth size="small" placeholder="Add a comment..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePostComment(); } }}
                    disabled={submittingComment}
                    error={!!commentError}
                    helperText={commentError}
                    inputProps={{ maxLength: 500 }}
                  />
                  <IconButton color="primary" onClick={handlePostComment}
                    disabled={!commentInput.trim() || submittingComment}>
                    {submittingComment ? <CircularProgress size={20} /> : <SendIcon />}
                  </IconButton>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Log in to leave a comment.
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {isEditing ? (
          <>
            <Button onClick={() => setIsEditing(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSaveEdit} variant="contained" disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : null}>
              Save Changes
            </Button>
          </>
        ) : (
          <Button onClick={onClose} variant="contained">Close</Button>
        )}
      </DialogActions>

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onClose={() => setReportDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Report Post</DialogTitle>
        <DialogContent>
          {reportSuccess ? (
            <Alert severity="success">Thank you for your report. An admin will review this post.</Alert>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Please explain why you're reporting this memorial post.
              </Typography>
              <TextField fullWidth multiline rows={4}
                label="Reason for reporting"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="e.g., Inappropriate content, spam, offensive language..."
              />
            </>
          )}
        </DialogContent>
        {!reportSuccess && (
          <DialogActions>
            <Button onClick={() => setReportDialogOpen(false)} disabled={submittingReport}>Cancel</Button>
            <Button onClick={handleSubmitReport} variant="contained" color="error"
              disabled={!reportReason.trim() || submittingReport}
              startIcon={submittingReport ? <CircularProgress size={16} /> : <FlagIcon />}>
              Submit Report
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </Dialog>
  );
}
