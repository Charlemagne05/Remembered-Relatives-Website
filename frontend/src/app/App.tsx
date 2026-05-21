import { useState, useEffect, useCallback } from 'react';
import {
  Container, Box, Typography, Fab, Button, AppBar, Toolbar,
  Avatar, Menu, MenuItem, ListItemIcon, CircularProgress, Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { MemorialGrid } from './components/MemorialGrid';
import { CreateMemorialDialog } from './components/CreateMemorialDialog';
import { MemorialDetailDialog } from './components/MemorialDetailDialog';
import { AuthDialog } from './components/AuthDialog';
import { RememberMeDialog } from './components/RememberMeDialog';
import { ProfileDialog } from './components/ProfileDialog';
import { type Memorial, type AuthUser, getStories } from '../api';

export type { Memorial };

export default function App() {
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedMemorial, setSelectedMemorial] = useState<Memorial | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [rememberMeDialogOpen, setRememberMeDialogOpen] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<AuthUser | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState<number | null>(null);
  const [selectedAuthorName, setSelectedAuthorName] = useState('');

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem('auth') || sessionStorage.getItem('auth');
    if (!raw) return null;
    try { return JSON.parse(raw) as AuthUser; } catch { return null; }
  });

  const fetchStories = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await getStories();
      setMemorials(data);
    } catch {
      setLoadError('Impossible de charger les histoires. Le serveur est-il démarré ?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  const handleStoryCreated = (story: Memorial) => {
    setMemorials((prev) => [story, ...prev]);
  };

  const handleStoryUpdated = (story: Memorial) => {
    setMemorials((prev) => prev.map((m) => (m.id === story.id ? story : m)));
    setSelectedMemorial(story);
  };

  const handleStoryDeleted = (id: number) => {
    setMemorials((prev) => prev.filter((m) => m.id !== id));
    setSelectedMemorial(null);
  };

  const handleLogin = (user: AuthUser) => {
    const hasAskedBefore = localStorage.getItem('hasAskedRememberMe');
    setAuthDialogOpen(false);
    if (hasAskedBefore) {
      localStorage.setItem('auth', JSON.stringify(user));
      setCurrentUser(user);
    } else {
      setPendingAuth(user);
      setRememberMeDialogOpen(true);
    }
  };

  const handleRememberMeAnswer = (remember: boolean) => {
    localStorage.setItem('hasAskedRememberMe', 'true');
    if (pendingAuth) {
      if (remember) {
        localStorage.setItem('auth', JSON.stringify(pendingAuth));
      } else {
        sessionStorage.setItem('auth', JSON.stringify(pendingAuth));
      }
      setCurrentUser(pendingAuth);
    }
    setPendingAuth(null);
    setRememberMeDialogOpen(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('auth');
    sessionStorage.removeItem('auth');
    setAnchorEl(null);
  };

  const handleAddMemorialClick = () => {
    if (!currentUser) {
      setAuthDialogOpen(true);
    } else {
      setCreateDialogOpen(true);
    }
  };

  const handleViewAuthorProfile = (authorName: string, authorId: number) => {
    setSelectedAuthorName(authorName);
    setSelectedAuthorId(authorId);
    setProfileDialogOpen(true);
  };

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #f8fafc, #f1f5f9)' }}>
      <AppBar position="static" color="transparent" elevation={0}
        sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            In Loving Memory
          </Typography>
          {currentUser ? (
            <>
              <Avatar onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{ cursor: 'pointer', bgcolor: 'primary.main' }}>
                {currentUser.username.charAt(0).toUpperCase()}
              </Avatar>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
                <MenuItem onClick={() => { setAnchorEl(null); }}>
                  <ListItemIcon><PersonIcon fontSize="small" /></ListItemIcon>
                  {currentUser.username}
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button startIcon={<LoginIcon />} onClick={() => setAuthDialogOpen(true)} variant="contained">
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" component="h1" sx={{ mb: 2 }}>
            In Loving Memory
          </Typography>
          <Typography variant="body1" color="text.secondary"
            sx={{ maxWidth: '42rem', mx: 'auto', mb: 4 }}>
            A place to honor and remember those who have touched our lives.
            Share their stories, celebrate their legacy, and keep their memory alive.
          </Typography>

          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mb: 6 }}>
            {!currentUser ? (
              <Button variant="contained" size="large" startIcon={<LoginIcon />}
                onClick={() => setAuthDialogOpen(true)}
                sx={{ fontSize: '1.25rem', py: 2, px: 5, minWidth: 200 }}>
                Login
              </Button>
            ) : (
              <Button variant="contained" size="large" startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
                sx={{ fontSize: '1.25rem', py: 2, px: 5, minWidth: 250 }}>
                Post a Story
              </Button>
            )}
          </Box>
        </Box>

        {loadError && <Alert severity="error" sx={{ mb: 3 }}>{loadError}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <MemorialGrid memorials={memorials} onSelectMemorial={setSelectedMemorial} />
        )}

        <Fab color="primary" aria-label="add memorial"
          sx={{ position: 'fixed', bottom: 32, right: 32 }}
          onClick={handleAddMemorialClick}>
          <AddIcon />
        </Fab>

        <AuthDialog
          open={authDialogOpen}
          onClose={() => setAuthDialogOpen(false)}
          onLogin={handleLogin}
        />

        <CreateMemorialDialog
          open={createDialogOpen}
          onClose={() => setCreateDialogOpen(false)}
          onCreated={handleStoryCreated}
        />

        <MemorialDetailDialog
          memorial={selectedMemorial}
          onClose={() => setSelectedMemorial(null)}
          currentUser={currentUser}
          onUpdated={handleStoryUpdated}
          onDeleted={handleStoryDeleted}
          onViewAuthorProfile={handleViewAuthorProfile}
        />

        <RememberMeDialog
          open={rememberMeDialogOpen}
          onAnswer={handleRememberMeAnswer}
        />

        {selectedAuthorId !== null && (
          <ProfileDialog
            open={profileDialogOpen}
            onClose={() => setProfileDialogOpen(false)}
            authorName={selectedAuthorName}
            authorId={selectedAuthorId}
            onSelectMemorial={(m) => {
              setProfileDialogOpen(false);
              setSelectedMemorial(m);
            }}
          />
        )}
      </Container>
    </Box>
  );
}
