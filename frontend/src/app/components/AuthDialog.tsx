import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, Box, Typography, Alert, Checkbox, FormControlLabel,
  CircularProgress,
} from '@mui/material';
import { login, register, type AuthUser } from '../../api';

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
  onLogin: (user: AuthUser) => void;
}

export function AuthDialog({ open, onClose, onLogin }: AuthDialogProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isNotRobot, setIsNotRobot] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isNotRobot) {
      setError('Please confirm you are not a robot');
      return;
    }

    if (isRegister && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      let user: AuthUser;
      if (isRegister) {
        user = await register(formData.username, formData.email, formData.password);
      } else {
        user = await login(formData.username, formData.password);
      }
      handleClose();
      onLogin(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleClose = () => {
    setFormData({ username: '', email: '', password: '', confirmPassword: '' });
    setError('');
    setIsRegister(false);
    setIsNotRobot(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth
      PaperProps={{ component: 'form', onSubmit: handleSubmit }}>
      <DialogTitle>{isRegister ? 'Create Account' : 'Sign In'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            autoFocus required fullWidth
            label="Username"
            placeholder="your_username"
            value={formData.username}
            onChange={handleChange('username')}
          />

          {isRegister && (
            <TextField
              required fullWidth type="email"
              label="Email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={handleChange('email')}
            />
          )}

          <TextField
            required fullWidth type="password"
            label="Password"
            value={formData.password}
            onChange={handleChange('password')}
          />

          {isRegister && (
            <TextField
              required fullWidth type="password"
              label="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
            />
          )}

          <FormControlLabel
            control={
              <Checkbox checked={isNotRobot} onChange={(e) => setIsNotRobot(e.target.checked)} />
            }
            label="I'm not a robot"
          />

          <Box sx={{ textAlign: 'center', mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
              <Button onClick={() => { setIsRegister(!isRegister); setError(''); }}
                sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}>
                {isRegister ? 'Sign In' : 'Register'}
              </Button>
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}>
          {isRegister ? 'Register' : 'Sign In'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
