import { useState, useEffect, useCallback } from 'react';
import {
  Container, Box, Typography, Fab, Button, AppBar, Toolbar,
  Avatar, Menu, MenuItem, ListItemIcon, CircularProgress, Alert,
  InputBase, Paper, IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import ShieldIcon from '@mui/icons-material/Shield';
import { MemorialGrid } from './components/MemorialGrid';
import { CreateMemorialDialog } from './components/CreateMemorialDialog';
import { MemorialDetailDialog } from './components/MemorialDetailDialog';
import { AuthDialog } from './components/AuthDialog';
import { RememberMeDialog } from './components/RememberMeDialog';
import { ProfileDialog } from './components/ProfileDialog';
import { AdminPanel } from './components/AdminPanel';
import { type Memorial, type AuthUser, getStories } from '../api';

export type { Memorial };

const COLOR_OPTIONS = [
  'linear-gradient(to bottom, #f8fafc, #f1f5f9)',
  'linear-gradient(to bottom, #fff7ed, #fed7aa)',
  'linear-gradient(to bottom, #eff6ff, #dbeafe)',
  'linear-gradient(to bottom, #f0fdf4, #dcfce7)',
  'linear-gradient(to bottom, #faf5ff, #f3e8ff)',
  'linear-gradient(to bottom, #fff1f2, #fce7f3)',
];

export default function App() {
  const [memorials, setMemorials] = useState<Memorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedMemorial, setSelectedMemorial] = useState<Memorial | null>(null);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [rememberMeDialogOpen, setRememberMeDialogOpen] = useState(false);
  const [pendingAuth, setPendingAuth] = useState<AuthUser | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedAuthorId, setSelectedAuthorId] = useState<number | null>(null);
  const [selectedAuthorName, setSelectedAuthorName] = useState('');
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  const [backgroundColor, setBackgroundColor] = useState<string>(() => {
    return localStorage.getItem('backgroundColor') || COLOR_OPTIONS[0];
  });

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

  // Filtrage local par recherche
  const filteredMemorials = searchQuery.trim()
    ? memorials.filter(m =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.author.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : memorials;

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

  const handleBackgroundColorChange = (color: string) => {
    setBackgroundColor(color);
    localStorage.setItem('backgroundColor', color);
  };

  const handleAddStoryClick = () => {
    if (!currentUser) {
      setAuthDialogOpen(true);
      return;
    }
    const userStoryCount = memorials.filter((m) => m.user_id === currentUser.id).length;
    if (userStoryCount >= 10) {
      alert('You have reached the maximum limit of 10 stories per account.');
      return;
    }
    setCreateDialogOpen(true);
  };

  const handleViewAuthorProfile = (authorName: string, authorId: number) => {
    setSelectedAuthorName(authorName);
    setSelectedAuthorId(authorId);
    setProfileDialogOpen(true);
  };

  const isBackgroundImage = backgroundColor.startsWith('url(');

  return (
    <Box sx={{
      minHeight: '100vh',
      ...(isBackgroundImage
        ? {
            backgroundImage: backgroundColor,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed',
          }
        : { background: backgroundColor }),
    }}>
      <AppBar position="static" color="transparent" elevation={0}
        sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Relatives Remembered
          </Typography>

          {/* Barre de recherche */}
          <Paper elevation={0} sx={{
            display: 'flex', alignItems: 'center',
            border: '1px solid', borderColor: 'divider', borderRadius: 3,
            px: 1.5, py: 0.5, mr: 2, width: { xs: 160, sm: 240 }, bgcolor: 'grey.50',
          }}>
            <SearchIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 20 }} />
            <InputBase
              placeholder="Search by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flex: 1, fontSize: '0.95rem' }}
            />
            {searchQuery && (
              <IconButton size="small" onClick={() => setSearchQuery('')} sx={{ p: 0.25 }}>
                <ClearIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </Paper>

          {currentUser ? (
            <>
              <Avatar onClick={(e) => setAnchorEl(e.currentTarget)}
                sx={{ cursor: 'pointer', bgcolor: 'primary.main' }}>
                {currentUser.username.charAt(0).toUpperCase()}
              </Avatar>
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
                {currentUser.is_admin && (
                  <MenuItem onClick={() => { setAnchorEl(null); setAdminPanelOpen(true); }}>
                    <ListItemIcon><ShieldIcon fontSize="small" /></ListItemIcon>
                    Admin Panel
                  </MenuItem>
                )}
                <MenuItem onClick={() => setAnchorEl(null)}>
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
            Relatives Remembered
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
                onClick={handleAddStoryClick}
                sx={{ fontSize: '1.25rem', py: 2, px: 5, minWidth: 250 }}>
                Post a Story
              </Button>
            )}
          </Box>
        </Box>

        {loadError && <Alert severity="error" sx={{ mb: 3 }}>{loadError}</Alert>}

        {searchQuery.trim() && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {filteredMemorials.length === 0
              ? `No stories found for "${searchQuery}"`
              : `${filteredMemorials.length} stor${filteredMemorials.length === 1 ? 'y' : 'ies'} found for "${searchQuery}"`}
          </Typography>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <MemorialGrid memorials={filteredMemorials} onSelectMemorial={setSelectedMemorial} />
        )}

        <Fab color="primary" aria-label="add memorial"
          sx={{ position: 'fixed', bottom: 32, right: 32 }}
          onClick={handleAddStoryClick}>
          <AddIcon />
        </Fab>

        <AuthDialog open={authDialogOpen} onClose={() => setAuthDialogOpen(false)} onLogin={handleLogin} />

        <CreateMemorialDialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} onCreated={handleStoryCreated} />

        <MemorialDetailDialog
          memorial={selectedMemorial}
          onClose={() => setSelectedMemorial(null)}
          currentUser={currentUser}
          onUpdated={handleStoryUpdated}
          onDeleted={handleStoryDeleted}
          onViewAuthorProfile={handleViewAuthorProfile}
        />

        <RememberMeDialog open={rememberMeDialogOpen} onAnswer={handleRememberMeAnswer} />

        {selectedAuthorId !== null && (
          <ProfileDialog
            open={profileDialogOpen}
            onClose={() => setProfileDialogOpen(false)}
            authorName={selectedAuthorName}
            authorId={selectedAuthorId}
            onSelectMemorial={(m) => { setProfileDialogOpen(false); setSelectedMemorial(m); }}
          />
        )}

        <AdminPanel
          open={adminPanelOpen}
          onClose={() => setAdminPanelOpen(false)}
          backgroundColor={backgroundColor}
          onBackgroundColorChange={handleBackgroundColorChange}
          colorOptions={COLOR_OPTIONS}
          onStoryDeleted={handleStoryDeleted}
        />
      </Container>
    </Box>
  );
}
