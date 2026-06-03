import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent,
  Box, Typography, Button, Card, CardContent, Divider, Chip, Alert,
  ToggleButtonGroup, ToggleButton, CircularProgress, TextField,
  IconButton, InputAdornment, List, ListItem, ListItemText,
} from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import BlockIcon from '@mui/icons-material/Block';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import GavelIcon from '@mui/icons-material/Gavel';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {
  getAdminReports, dismissReports, deleteStory, type ReportedStory,
  getBannedWords, addBannedWord, deleteBannedWord, type BannedWord,
} from '../../api';

const COLOR_LABELS: Record<string, string> = {
  'linear-gradient(to bottom, #f8fafc, #f1f5f9)': 'Default (Gray)',
  'linear-gradient(to bottom, #fff7ed, #fed7aa)': 'Warm (Orange)',
  'linear-gradient(to bottom, #eff6ff, #dbeafe)': 'Cool (Blue)',
  'linear-gradient(to bottom, #f0fdf4, #dcfce7)': 'Nature (Green)',
  'linear-gradient(to bottom, #faf5ff, #f3e8ff)': 'Lavender (Purple)',
  'linear-gradient(to bottom, #fff1f2, #fce7f3)': 'Rose (Pink)',
};

interface AdminPanelProps {
  open: boolean;
  onClose: () => void;
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
  colorOptions: string[];
  onStoryDeleted: (id: number) => void;
}

export function AdminPanel({
  open, onClose, backgroundColor, onBackgroundColorChange, colorOptions, onStoryDeleted,
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'reports' | 'words' | 'colors'>('reports');

  const isCustomImage = backgroundColor.startsWith('url(');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, etc.)');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      onBackgroundColorChange(`url(${reader.result as string})`);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomImage = () => {
    onBackgroundColorChange(colorOptions[0]);
  };

  // Reports
  const [reportedStories, setReportedStories] = useState<ReportedStory[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [errorReports, setErrorReports] = useState('');

  // Banned words
  const [bannedWords, setBannedWords] = useState<BannedWord[]>([]);
  const [loadingWords, setLoadingWords] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [addingWord, setAddingWord] = useState(false);
  const [wordError, setWordError] = useState('');
  const [wordSearch, setWordSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    if (activeTab === 'reports') {
      setLoadingReports(true);
      setErrorReports('');
      getAdminReports()
        .then(setReportedStories)
        .catch(() => setErrorReports('Impossible de charger les signalements'))
        .finally(() => setLoadingReports(false));
    }
    if (activeTab === 'words') {
      setLoadingWords(true);
      getBannedWords()
        .then(setBannedWords)
        .catch(() => {})
        .finally(() => setLoadingWords(false));
    }
  }, [open, activeTab]);

  const handleBanPost = async (story: ReportedStory) => {
    if (!window.confirm(`Ban "${story.title}"? This will permanently delete it.`)) return;
    try {
      await deleteStory(story.id);
      setReportedStories((prev) => prev.filter((s) => s.id !== story.id));
      onStoryDeleted(story.id);
    } catch { alert('Error banning post'); }
  };

  const handleDismissReports = async (story: ReportedStory) => {
    if (!window.confirm('Dismiss all reports for this post?')) return;
    try {
      await dismissReports(story.id);
      setReportedStories((prev) => prev.filter((s) => s.id !== story.id));
    } catch { alert('Error dismissing reports'); }
  };

  const handleAddWord = async () => {
    const word = newWord.trim().toLowerCase();
    if (!word) return;
    setAddingWord(true);
    setWordError('');
    try {
      const added = await addBannedWord(word);
      setBannedWords((prev) => [...prev, added].sort((a, b) => a.word.localeCompare(b.word)));
      setNewWord('');
    } catch (err: unknown) {
      setWordError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setAddingWord(false);
    }
  };

  const handleDeleteWord = async (id: number) => {
    try {
      await deleteBannedWord(id);
      setBannedWords((prev) => prev.filter((w) => w.id !== id));
    } catch { alert('Erreur lors de la suppression'); }
  };

  const filteredWords = wordSearch.trim()
    ? bannedWords.filter((w) => w.word.includes(wordSearch.toLowerCase()))
    : bannedWords;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: '1.5rem', fontWeight: 600 }}>
        Admin Panel
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <ToggleButtonGroup value={activeTab} exclusive
            onChange={(_, v) => v && setActiveTab(v)} fullWidth>
            <ToggleButton value="reports">
              <FlagIcon sx={{ mr: 1 }} />
              Reports {reportedStories.length > 0 && `(${reportedStories.length})`}
            </ToggleButton>
            <ToggleButton value="words">
              <GavelIcon sx={{ mr: 1 }} />
              Banned Words {bannedWords.length > 0 && `(${bannedWords.length})`}
            </ToggleButton>
            <ToggleButton value="colors">
              <PaletteIcon sx={{ mr: 1 }} />
              Colors
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* ── REPORTS ── */}
        {activeTab === 'reports' && (
          <Box>
            {loadingReports ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : errorReports ? (
              <Alert severity="error">{errorReports}</Alert>
            ) : reportedStories.length === 0 ? (
              <Alert severity="info" icon={<PeopleIcon />}>No reported posts at the moment.</Alert>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {reportedStories.map((story) => (
                  <Card key={story.id} variant="outlined">
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="h6">{story.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            by {story.author} · {new Date(story.created_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                        <Chip icon={<FlagIcon />}
                          label={`${story.report_count} report${story.report_count !== 1 ? 's' : ''}`}
                          color="error" size="small" />
                      </Box>
                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {story.content.length > 200 ? story.content.substring(0, 200) + '…' : story.content}
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Reports:</Typography>
                      {story.reports.map((report) => (
                        <Alert key={report.id} severity="warning" sx={{ mb: 1 }}>
                          <Typography variant="body2">
                            <strong>{report.reported_by_username}</strong>: {report.reason}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(report.created_at).toLocaleString()}
                          </Typography>
                        </Alert>
                      ))}
                      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Button variant="outlined" color="success" startIcon={<CheckCircleIcon />}
                          onClick={() => handleDismissReports(story)}>
                          Dismiss Reports
                        </Button>
                        <Button variant="contained" color="error" startIcon={<BlockIcon />}
                          onClick={() => handleBanPost(story)}>
                          Ban Post
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </Box>
        )}

        {/* ── BANNED WORDS ── */}
        {activeTab === 'words' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Les mots de cette liste sont bloqués partout sur le site (titres, stories, commentaires).
              La vérification est insensible à la casse.
            </Typography>

            {/* Add word */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                size="small" fullWidth
                label="Ajouter un mot interdit"
                placeholder="ex: insulte"
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddWord(); }}
                error={!!wordError}
                helperText={wordError}
                inputProps={{ maxLength: 50 }}
              />
              <Button variant="contained" onClick={handleAddWord}
                disabled={!newWord.trim() || addingWord}
                startIcon={addingWord ? <CircularProgress size={16} /> : <AddIcon />}
                sx={{ whiteSpace: 'nowrap', minWidth: 120 }}>
                Add Word
              </Button>
            </Box>

            {/* Search */}
            <TextField
              size="small" fullWidth
              placeholder={`Search in ${bannedWords.length} words…`}
              value={wordSearch}
              onChange={(e) => setWordSearch(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: wordSearch && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setWordSearch('')}>✕</IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {loadingWords ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{
                maxHeight: 380, overflowY: 'auto',
                border: '1px solid', borderColor: 'divider', borderRadius: 1,
              }}>
                {filteredWords.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    {wordSearch ? 'Aucun résultat.' : 'Aucun mot banni pour l\'instant.'}
                  </Typography>
                ) : (
                  <List dense disablePadding>
                    {filteredWords.map((w, i) => (
                      <ListItem
                        key={w.id}
                        divider={i < filteredWords.length - 1}
                        secondaryAction={
                          <IconButton size="small" edge="end" color="error"
                            onClick={() => handleDeleteWord(w.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        }
                      >
                        <ListItemText
                          primary={<Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{w.word}</Typography>}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            )}
            {filteredWords.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {filteredWords.length} mot{filteredWords.length > 1 ? 's' : ''} {wordSearch ? 'trouvé' + (filteredWords.length > 1 ? 's' : '') : 'au total'}
              </Typography>
            )}
          </Box>
        )}

        {/* ── COLORS ── */}
        {activeTab === 'colors' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose a background color theme for the entire website
            </Typography>

            {/* Custom background image upload */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Custom Background Image
              </Typography>
              {isCustomImage ? (
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Alert severity="success" sx={{ flex: 1 }}>
                    Custom background image is active
                  </Alert>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleRemoveCustomImage}
                  >
                    Remove
                  </Button>
                </Box>
              ) : (
                <Button
                  component="label"
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  sx={{ py: 2 }}
                >
                  Upload Background Image
                  <input
                    type="file"
                    hidden
                    accept="image/png,image/jpg,image/jpeg,image/webp"
                    onChange={handleImageUpload}
                  />
                </Button>
              )}
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Preset Color Gradients
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {colorOptions.map((color) => (
                <Button key={color}
                  variant={backgroundColor === color ? 'contained' : 'outlined'}
                  onClick={() => onBackgroundColorChange(color)}
                  sx={{ justifyContent: 'flex-start', py: 2, px: 3, textTransform: 'none' }}>
                  <Box sx={{
                    width: 40, height: 40, borderRadius: 1, background: color,
                    border: '2px solid', borderColor: 'divider', mr: 2, flexShrink: 0,
                  }} />
                  <Typography>{COLOR_LABELS[color] ?? color}</Typography>
                </Button>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
