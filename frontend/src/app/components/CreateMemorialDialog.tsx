import { useState, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Box, Typography, IconButton, CircularProgress, Alert,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { createStory, type Memorial } from '../../api';

const MAX_IMAGES = 15;

interface CreateMemorialDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (memorial: Memorial) => void;
}

export function CreateMemorialDialog({ open, onClose, onCreated }: CreateMemorialDialogProps) {
  const [formData, setFormData] = useState({ title: '', relationship: '', content: '' });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const story = await createStory({
        title: formData.title,
        relationship: formData.relationship,
        content: formData.content,
        is_public: 1,
        images: imageFiles,
      });
      onCreated(story);
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = MAX_IMAGES - imageFiles.length;
    const toAdd = files.slice(0, remaining);

    setImageFiles((prev) => [...prev, ...toAdd]);
    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        setImagePreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClose = () => {
    setFormData({ title: '', relationship: '', content: '' });
    setImageFiles([]);
    setImagePreviews([]);
    setError('');
    onClose();
  };

  const isValid = formData.title.length >= 3 && formData.relationship && formData.content.length >= 10;
  const canAddMore = imageFiles.length < MAX_IMAGES;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      PaperProps={{ component: 'form', onSubmit: handleSubmit }}>
      <DialogTitle>Share a Memorial</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            autoFocus required fullWidth
            label="Name of loved one"
            placeholder="e.g., John Smith"
            value={formData.title}
            onChange={handleChange('title')}
            inputProps={{ maxLength: 100 }}
            helperText={`${formData.title.length} / 100 characters`}
          />

          <TextField
            required fullWidth
            label="Your relationship"
            placeholder="e.g., Father, Best Friend, Mentor"
            value={formData.relationship}
            onChange={handleChange('relationship')}
            inputProps={{ maxLength: 50 }}
            helperText={`${formData.relationship.length} / 50 characters`}
          />

          <TextField
            required fullWidth multiline rows={6}
            label="Their story"
            placeholder="Share a memory, what they meant to you, or how they impacted your life..."
            value={formData.content}
            onChange={handleChange('content')}
            inputProps={{ maxLength: 4000 }}
            helperText={`${formData.content.length} / 4000 characters`}
            error={formData.content.length > 4000}
          />

          {/* Photos section */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2">
                Photos (optional) — {imageFiles.length} / {MAX_IMAGES}
              </Typography>
              {canAddMore && imagePreviews.length > 0 && (
                <Button size="small" component="label" startIcon={<AddPhotoAlternateIcon />} variant="outlined">
                  Add more
                  <input ref={fileInputRef} type="file" hidden multiple
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageUpload} />
                </Button>
              )}
            </Box>

            {imagePreviews.length === 0 ? (
              <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />}
                fullWidth sx={{ py: 3, borderStyle: 'dashed' }}>
                Upload up to {MAX_IMAGES} photos
                <input ref={fileInputRef} type="file" hidden multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageUpload} />
              </Button>
            ) : (
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                gap: 1,
              }}>
                {imagePreviews.map((preview, i) => (
                  <Box key={i} sx={{
                    position: 'relative', aspectRatio: '1',
                    borderRadius: 1, overflow: 'hidden',
                    border: '1px solid', borderColor: 'divider',
                  }}>
                    <img src={preview} alt={`Photo ${i + 1}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <IconButton size="small" onClick={() => handleRemoveImage(i)} sx={{
                      position: 'absolute', top: 2, right: 2,
                      bgcolor: 'rgba(0,0,0,0.55)', color: 'white', p: 0.3,
                      '&:hover': { bgcolor: 'error.main' },
                    }}>
                      <DeleteIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={!isValid || loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}>
          Share Memorial
        </Button>
      </DialogActions>
    </Dialog>
  );
}
