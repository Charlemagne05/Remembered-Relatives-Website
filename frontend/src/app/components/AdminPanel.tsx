import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent,
  Box, Typography, Button, Card, CardContent, Divider, Chip, Alert,
  ToggleButtonGroup, ToggleButton, CircularProgress,
} from '@mui/material';
import FlagIcon from '@mui/icons-material/Flag';
import BlockIcon from '@mui/icons-material/Block';
import PaletteIcon from '@mui/icons-material/Palette';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PeopleIcon from '@mui/icons-material/People';
import { getAdminReports, dismissReports, deleteStory, type ReportedStory } from '../../api';

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
  const [activeTab, setActiveTab] = useState<'reports' | 'colors'>('reports');
  const [reportedStories, setReportedStories] = useState<ReportedStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || activeTab !== 'reports') return;
    setLoading(true);
    setError('');
    getAdminReports()
      .then(setReportedStories)
      .catch(() => setError('Impossible de charger les signalements'))
      .finally(() => setLoading(false));
  }, [open, activeTab]);

  const handleBanPost = async (story: ReportedStory) => {
    if (!window.confirm(`Ban "${story.title}"? This will permanently delete it.`)) return;
    try {
      await deleteStory(story.id);
      setReportedStories((prev) => prev.filter((s) => s.id !== story.id));
      onStoryDeleted(story.id);
    } catch {
      alert('Error banning post');
    }
  };

  const handleDismissReports = async (story: ReportedStory) => {
    if (!window.confirm('Dismiss all reports for this post? It will remain visible.')) return;
    try {
      await dismissReports(story.id);
      setReportedStories((prev) => prev.filter((s) => s.id !== story.id));
    } catch {
      alert('Error dismissing reports');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '1.5rem', fontWeight: 600 }}>
        Admin Panel
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <ToggleButtonGroup value={activeTab} exclusive
            onChange={(_, v) => v && setActiveTab(v)} fullWidth>
            <ToggleButton value="reports">
              <FlagIcon sx={{ mr: 1 }} />
              Reported Posts {reportedStories.length > 0 && `(${reportedStories.length})`}
            </ToggleButton>
            <ToggleButton value="colors">
              <PaletteIcon sx={{ mr: 1 }} />
              Color Palette
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {activeTab === 'reports' && (
          <Box>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : reportedStories.length === 0 ? (
              <Alert severity="info" icon={<PeopleIcon />}>
                No reported posts at the moment.
              </Alert>
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

        {activeTab === 'colors' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose a background color theme for the entire website
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
