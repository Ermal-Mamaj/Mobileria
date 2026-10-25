import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminAuthProvider, useAdminAuth } from './AdminAuth.jsx';
import { UnsavedChangesProvider } from './UnsavedChangesContext.jsx';
import AdminLayout from './AdminLayout.jsx';
import DashboardSection from './sections/DashboardSection.jsx';
import CollectionsListSection from './sections/CollectionsListSection.jsx';
import CollectionDetailSection from './sections/CollectionDetailSection.jsx';
import SalesListSection from './sections/SalesListSection.jsx';
import SaleFormSection from './sections/SaleFormSection.jsx';
import SaleDocumentSection from './sections/SaleDocumentSection.jsx';
import PagesSection from './sections/PagesSection.jsx';
import SiteSettingsSection from './sections/SiteSettingsSection.jsx';
import MessagesSection from './sections/MessagesSection.jsx';
// The CMS keeps its own type (Fraunces); the public site is set in Cormorant.
import '@fontsource-variable/fraunces/full.css';
import './admin.css';

function Protected() {
  const { checked, loggedIn } = useAdminAuth();

  if (!checked) return null;
  if (!loggedIn) return <Navigate to="/bellacasa-cms/login" replace />;

  return (
    <UnsavedChangesProvider>
      <AdminLayout>
        <Routes>
          <Route index element={<DashboardSection />} />
          {/* Products are managed inside each collection now; keep old links/bookmarks working. */}
          <Route path="products" element={<Navigate to="/bellacasa-cms/collections" replace />} />
          <Route path="collections" element={<CollectionsListSection />} />
          <Route path="collections/:id" element={<CollectionDetailSection />} />
          <Route path="sales" element={<SalesListSection />} />
          <Route path="sales/new" element={<SaleFormSection />} />
          <Route path="sales/:id" element={<SaleDocumentSection />} />
          <Route path="sales/:id/edit" element={<SaleFormSection />} />
          <Route path="pages" element={<PagesSection />} />
          <Route path="messages" element={<MessagesSection />} />
          <Route path="settings" element={<SiteSettingsSection />} />
        </Routes>
      </AdminLayout>
    </UnsavedChangesProvider>
  );
}

export default function AdminDashboard() {
  return (
    <AdminAuthProvider>
      <Protected />
    </AdminAuthProvider>
  );
}
