import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

interface RememberMeDialogProps {
  open: boolean;
  onAnswer: (remember: boolean) => void;
}

export function RememberMeDialog({ open, onAnswer }: RememberMeDialogProps) {
  return (
    <Dialog open={open} maxWidth="xs" fullWidth>
      <DialogTitle>Stay Logged In?</DialogTitle>
      <DialogContent>
        <Typography variant="body1">
          Would you like us to remember that you're logged in so you don't have to enter your email again next time?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onAnswer(false)} variant="outlined">
          No
        </Button>
        <Button onClick={() => onAnswer(true)} variant="contained">
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
