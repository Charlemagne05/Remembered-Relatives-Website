import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Box, Typography, IconButton, CircularProgress, Alert,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { createStory, type Memorial } from '../../api';

interface CreateMemorialDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (memorial: Memorial) => void;
}

export function CreateMemorialDialog({ open, onClose, onCreated }: CreateMemorialDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    relationship: '',
    content: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        image: imageFile,
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
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleClose = () => {
    setFormData({ title: '', relationship: '', content: '' });
    setImageFile(null);
    setImagePreview(null);
    setError('');
    onClose();
  };

  const isValid = formData.title.length >= 3 && formData.relationship && formData.content.length >= 10;

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

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Photo (optional)
            </Typography>
            {imagePreview ? (
              <Box sx={{ position: 'relative', width: 200, height: 150, borderRadius: 1, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <IconButton size="small" onClick={handleRemoveImage}
                  sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'background.paper', '&:hover': { bgcolor: 'error.main', color: 'white' } }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            ) : (
              <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} fullWidth>
                Upload Photo
                <input type="file" hidden accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleImageUpload} />
              </Button>
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
