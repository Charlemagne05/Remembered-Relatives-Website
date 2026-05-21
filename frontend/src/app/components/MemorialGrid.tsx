import { Card, CardContent, CardActionArea, Typography, Box, Chip } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { type Memorial } from '../../api';

interface MemorialGridProps {
  memorials: Memorial[];
  onSelectMemorial: (memorial: Memorial) => void;
}

export function MemorialGrid({ memorials, onSelectMemorial }: MemorialGridProps) {
  if (memorials.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 16 }}>
        <Typography variant="h6" color="text.secondary">
          No memorials yet. Be the first to share a story.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {memorials.map((memorial) => (
        <Card key={memorial.id} sx={{ minHeight: 250, display: 'flex', flexDirection: 'column' }}>
          <CardActionArea
            onClick={() => onSelectMemorial(memorial)}
            sx={{ flexGrow: 1, display: 'flex', alignItems: 'stretch' }}
          >
            <CardContent sx={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
              {memorial.image_path && (
                <Box sx={{ width: '100%', height: 150, mb: 2, borderRadius: 1, overflow: 'hidden' }}>
                  <img
                    src={memorial.image_path}
                    alt={memorial.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <FavoriteIcon sx={{ color: 'error.light', fontSize: 18 }} />
                <Typography variant="h6" component="h2" sx={{ flex: 1 }}>
                  {memorial.title}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {memorial.user_liked
                    ? <FavoriteIcon sx={{ color: 'error.main', fontSize: 16 }} />
                    : <FavoriteBorderIcon sx={{ color: 'text.disabled', fontSize: 16 }} />}
                  <Typography variant="caption" color="text.secondary">{memorial.likes}</Typography>
                </Box>
              </Box>

              <Chip
                label={memorial.relationship}
                size="small"
                variant="outlined"
                sx={{ mb: 2, alignSelf: 'flex-start' }}
              />

              <Typography variant="body2" color="text.secondary" sx={{
                mb: 2,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                flexGrow: 1,
              }}>
                {memorial.content}
              </Typography>

              <Box sx={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                pt: 2, borderTop: '1px solid', borderColor: 'divider',
                fontSize: '0.875rem', color: 'text.secondary',
              }}>
                <span>By {memorial.author}</span>
                <span>{new Date(memorial.created_at).toLocaleDateString()}</span>
              </Box>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  );
}
