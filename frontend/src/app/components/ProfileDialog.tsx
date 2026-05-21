import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Card, CardContent, CardActionArea,
  Chip, CircularProgress,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { getUserStories, type Memorial } from '../../api';

interface ProfileDialogProps {
  open: boolean;
  onClose: () => void;
  authorName: string;
  authorId: number;
  onSelectMemorial: (memorial: Memorial) => void;
}

export function ProfileDialog({ open, onClose, authorName, authorId, onSelectMemorial }: ProfileDialogProps) {
  const [stories, setStories] = useState<Memorial[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getUserStories(authorId)
      .then(setStories)
      .catch(() => setStories([]))
      .finally(() => setLoading(false));
  }, [open, authorId]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PersonIcon />
          <Box>
            <Typography variant="h5">{authorName}</Typography>
            {!loading && (
              <Typography variant="body2" color="text.secondary">
                {stories.length} {stories.length === 1 ? 'story' : 'stories'} shared
              </Typography>
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : stories.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">No stories shared yet</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {stories.map((story) => (
              <Card key={story.id} variant="outlined">
                <CardActionArea onClick={() => onSelectMemorial(story)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <FavoriteIcon sx={{ color: 'error.light' }} fontSize="small" />
                      <Typography variant="h6">{story.title}</Typography>
                    </Box>
                    <Chip label={story.relationship} size="small" variant="outlined" sx={{ mb: 1 }} />
                    <Typography variant="body2" color="text.secondary" sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {story.content}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      {new Date(story.created_at).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">Close</Button>
      </DialogActions>
    </Dialog>
  );
}
