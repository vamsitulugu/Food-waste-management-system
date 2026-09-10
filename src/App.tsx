import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { RequireAuth } from './routes/RequireAuth';
import { AppShell } from './components/common/AppShell';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ChooseRolePage } from './pages/ChooseRolePage';
import { DashboardPage } from './pages/DashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { OrganizationsPage } from './pages/OrganizationsPage';
import { NewOrganizationPage } from './pages/NewOrganizationPage';
import { OrganizationDetailPage } from './pages/OrganizationDetailPage';
import { NewDonationPage } from './pages/NewDonationPage';
import { EditDonationPage } from './pages/EditDonationPage';
import { MyDonationsPage } from './pages/MyDonationsPage';
import { BrowsePage } from './pages/BrowsePage';
import { DonationDetailPage } from './pages/DonationDetailPage';
import { MyClaimsPage } from './pages/MyClaimsPage';
import { SavedDonationsPage } from './pages/SavedDonationsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { VolunteerTasksPage } from './pages/VolunteerTasksPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminOrganizationsPage } from './pages/admin/AdminOrganizationsPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminDonationsPage } from './pages/admin/AdminDonationsPage';
import { AdminAuditLogPage } from './pages/admin/AdminAuditLogPage';
import { NotFoundPage } from './pages/NotFoundPage';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="/choose-role"
              element={
                <RequireAuth requireRoleSelected={false}>
                  <ChooseRolePage />
                </RequireAuth>
              }
            />

            <Route
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />

              <Route path="/organizations" element={<OrganizationsPage />} />
              <Route path="/organizations/new" element={<NewOrganizationPage />} />
              <Route path="/organizations/:orgId" element={<OrganizationDetailPage />} />

              <Route path="/donations/new" element={<NewDonationPage />} />
              <Route path="/donations/:donationId/edit" element={<EditDonationPage />} />
              <Route path="/donations/:donationId" element={<DonationDetailPage />} />
              <Route path="/my-donations" element={<MyDonationsPage />} />

              <Route path="/browse" element={<BrowsePage />} />
              <Route path="/my-claims" element={<MyClaimsPage />} />
              <Route path="/saved" element={<SavedDonationsPage />} />

              <Route path="/notifications" element={<NotificationsPage />} />

              <Route path="/volunteer/tasks" element={<VolunteerTasksPage />} />
              <Route path="/volunteer/my-tasks" element={<MyTasksPage />} />

              <Route
                path="/admin"
                element={
                  <RequireAuth allowedRoles={['admin']}>
                    <AdminDashboardPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/organizations"
                element={
                  <RequireAuth allowedRoles={['admin']}>
                    <AdminOrganizationsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <RequireAuth allowedRoles={['admin']}>
                    <AdminReportsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <RequireAuth allowedRoles={['admin']}>
                    <AdminUsersPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/donations"
                element={
                  <RequireAuth allowedRoles={['admin']}>
                    <AdminDonationsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin/audit-log"
                element={
                  <RequireAuth allowedRoles={['admin']}>
                    <AdminAuditLogPage />
                  </RequireAuth>
                }
              />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}
