import { useEffect, lazy } from 'react';

import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { Toaster } from 'sonner';

import { useAuthStore } from '@/stores/authStore';

import { connectSocket, useSocketNotifications } from '@/lib/socket';

import { AppShell } from '@/components/layout/AppShell';

import { LoginPage } from '@/pages/Login';

const RoleHomePage = lazy(() => import('@/pages/RoleHome').then((m) => ({ default: m.RoleHomePage })));
const SiteHomePage = lazy(() => import('@/pages/site/SiteHome').then((m) => ({ default: m.SiteHomePage })));
const StoreHomePage = lazy(() => import('@/pages/store/StoreHome').then((m) => ({ default: m.StoreHomePage })));
const PMHomePage = lazy(() => import('@/pages/pm/PMHome').then((m) => ({ default: m.PMHomePage })));
const ExecutiveHomePage = lazy(() =>
  import('@/pages/executive/ExecutiveHome').then((m) => ({ default: m.ExecutiveHomePage }))
);
const CoordinatorHomePage = lazy(() =>
  import('@/pages/coordinator/CoordinatorHome').then((m) => ({ default: m.CoordinatorHomePage }))
);
const CoordinatorVerifyPOsPage = lazy(() =>
  import('@/pages/coordinator/VerifyPOs').then((m) => ({ default: m.CoordinatorVerifyPOsPage }))
);
const CoordinatorVerifyWOsPage = lazy(() =>
  import('@/pages/coordinator/VerifyWOs').then((m) => ({ default: m.CoordinatorVerifyWOsPage }))
);
const ChairmanHomePage = lazy(() =>
  import('@/pages/chairman/ChairmanHome').then((m) => ({ default: m.ChairmanHomePage }))
);
const ChairmanApprovePOsPage = lazy(() =>
  import('@/pages/chairman/ApprovePOs').then((m) => ({ default: m.ChairmanApprovePOsPage }))
);
const ChairmanApproveWOsPage = lazy(() =>
  import('@/pages/chairman/ApproveWOs').then((m) => ({ default: m.ChairmanApproveWOsPage }))
);
const UserAnalyticsPage = lazy(() =>
  import('@/pages/chairman/UserAnalytics').then((m) => ({ default: m.UserAnalyticsPage }))
);
const RequestWizardPage = lazy(() =>
  import('@/pages/site/RequestWizard').then((m) => ({ default: m.RequestWizardPage }))
);
const MyRequestsPage = lazy(() => import('@/pages/site/MyRequests').then((m) => ({ default: m.MyRequestsPage })));
const RequestDetailPage = lazy(() =>
  import('@/pages/site/RequestDetail').then((m) => ({ default: m.RequestDetailPage }))
);
const AllocateFlowPage = lazy(() =>
  import('@/pages/store/AllocateFlow').then((m) => ({ default: m.AllocateFlowPage }))
);
const StockPage = lazy(() => import('@/pages/store/StockPage').then((m) => ({ default: m.StockPage })));
const StorePendingRequestsPage = lazy(() =>
  import('@/pages/store/StorePendingRequests').then((m) => ({ default: m.StorePendingRequestsPage }))
);
const StoreCompleteIndentsPage = lazy(() =>
  import('@/pages/store/StoreCompleteIndents').then((m) => ({ default: m.StoreCompleteIndentsPage }))
);
const GrnReceivePage = lazy(() =>
  import('@/pages/store/GrnReceive').then((m) => ({ default: m.GrnReceivePage }))
);
const VerifyDeliveryPage = lazy(() =>
  import('@/pages/store/VerifyDelivery').then((m) => ({ default: m.VerifyDeliveryPage }))
);
const IssueMaterialPage = lazy(() =>
  import('@/pages/store/IssueMaterial').then((m) => ({ default: m.IssueMaterialPage }))
);
const BranchTransfersPage = lazy(() =>
  import('@/pages/shared/BranchTransfers').then((m) => ({ default: m.BranchTransfersPage }))
);
const BranchTransferDetailPage = lazy(() =>
  import('@/pages/branchTransfers/BranchTransferDetail').then((m) => ({
    default: m.BranchTransferDetailPage,
  }))
);
const PMBranchTransferRequestsPage = lazy(() =>
  import('@/pages/pm/PMBranchTransferRequests').then((m) => ({
    default: m.PMBranchTransferRequestsPage,
  }))
);
const NotificationsPage = lazy(() =>
  import('@/pages/Notifications').then((m) => ({ default: m.NotificationsPage }))
);
const PMApprovalsPage = lazy(() => import('@/pages/pm/PMApprovals').then((m) => ({ default: m.PMApprovalsPage })));
const PMPOApprovalsPage = lazy(() =>
  import('@/pages/pm/PMPOApprovals').then((m) => ({ default: m.PMPOApprovalsPage }))
);
const PMPurchaseRequestsPage = lazy(() =>
  import('@/pages/pm/PMPurchaseRequests').then((m) => ({ default: m.PMPurchaseRequestsPage }))
);
const POWizardPage = lazy(() => import('@/pages/executive/POWizard').then((m) => ({ default: m.POWizardPage })));
const PODetailPage = lazy(() => import('@/pages/procurement/PODetail').then((m) => ({ default: m.PODetailPage })));
const AuditLogViewerPage = lazy(() =>
  import('@/pages/audit/AuditLogViewer').then((m) => ({ default: m.AuditLogViewerPage }))
);
const ExplorerPage = lazy(() => import('@/pages/explorer/ExplorerPage').then((m) => ({ default: m.ExplorerPage })));
const VendorsListPage = lazy(() => import('@/pages/vendors/VendorsList').then((m) => ({ default: m.VendorsListPage })));
const VendorScorecardPage = lazy(() =>
  import('@/pages/vendors/VendorScorecard').then((m) => ({ default: m.VendorScorecardPage }))
);
const ProfilePage = lazy(() => import('@/pages/Profile').then((m) => ({ default: m.ProfilePage })));
const CreateWorkOrderPage = lazy(() =>
  import('@/pages/executive/CreateWorkOrder').then((m) => ({ default: m.CreateWorkOrderPage }))
);
const WorkOrderDetailPage = lazy(() =>
  import('@/pages/workOrders/WorkOrderDetail').then((m) => ({ default: m.WorkOrderDetailPage }))
);
const PMApproveWOsPage = lazy(() =>
  import('@/pages/pm/PMApproveWOs').then((m) => ({ default: m.PMApproveWOsPage }))
);
const ExecutiveReviewWOsPage = lazy(() =>
  import('@/pages/executive/ExecutiveReviewWOs').then((m) => ({ default: m.ExecutiveReviewWOsPage }))
);
const UserProvisioningPage = lazy(() =>
  import('@/pages/admin/UserProvisioning').then((m) => ({ default: m.UserProvisioningPage }))
);
const ProjectAdminPage = lazy(() =>
  import('@/pages/admin/ProjectAdmin').then((m) => ({ default: m.ProjectAdminPage }))
);
const VendorAdminPage = lazy(() =>
  import('@/pages/admin/VendorAdmin').then((m) => ({ default: m.VendorAdminPage }))
);
const CreateMaterialPage = lazy(() =>
  import('@/pages/materials/CreateMaterial').then((m) => ({ default: m.CreateMaterialPage }))
);
const IncidentsPage = lazy(() =>
  import('@/pages/incidents/IncidentsPage').then((m) => ({ default: m.IncidentsPage }))
);
const FinancePage = lazy(() =>
  import('@/pages/finance/FinancePage').then((m) => ({ default: m.FinancePage }))
);
const ExecutivePurchaseRequestsPage = lazy(() =>
  import('@/pages/executive/ExecutivePurchaseRequests').then((m) => ({
    default: m.ExecutivePurchaseRequestsPage,
  }))
);
const ExecutivePurchaseRequestDetailPage = lazy(() =>
  import('@/pages/executive/ExecutivePurchaseRequestDetail').then((m) => ({
    default: m.ExecutivePurchaseRequestDetailPage,
  }))
);
const ProcurementDecisionsListPage = lazy(() =>
  import('@/pages/procurement/ProcurementDecisionsList').then((m) => ({
    default: m.ProcurementDecisionsListPage,
  }))
);
const ProcurementDecisionDetailPage = lazy(() =>
  import('@/pages/procurement/ProcurementDecisionDetail').then((m) => ({
    default: m.ProcurementDecisionDetailPage,
  }))
);

import { RoleGuard } from '@/components/RoleGuard';

import { UserRole } from '@afios/shared';

import { getRoleHomePath } from '@/lib/rolePaths';



const queryClient = new QueryClient({

  defaultOptions: {

    queries: { retry: 1, staleTime: 30_000 },

  },

});



function ProtectedRoute({ children }: { children: React.ReactNode }) {

  const user = useAuthStore((s) => s.user);

  const accessToken = useAuthStore((s) => s.accessToken);

  const location = useLocation();

  if (!user || !accessToken) {

    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;

  }

  return <>{children}</>;

}



function RoleHomeRedirect() {

  const user = useAuthStore((s) => s.user)!;

  return <Navigate to={getRoleHomePath(user.role)} replace />;

}



function SocketProvider({ children }: { children: React.ReactNode }) {

  const accessToken = useAuthStore((s) => s.accessToken);

  const { setup } = useSocketNotifications();



  useEffect(() => {

    if (accessToken) {

      connectSocket();

      setup();

    }

  }, [accessToken, setup]);



  return <>{children}</>;

}



export default function App() {

  return (

    <QueryClientProvider client={queryClient}>

      <BrowserRouter>

        <SocketProvider>

          <Routes>

            <Route path="/login" element={<LoginPage />} />

            <Route

              element={

                <ProtectedRoute>

                  <AppShell />

                </ProtectedRoute>

              }

            >

              <Route path="/" element={<RoleHomeRedirect />} />

              <Route

                path="/site"

                element={

                  <RoleGuard roles={[UserRole.SITE_INCHARGE]}>

                    <SiteHomePage />

                  </RoleGuard>

                }

              />

              <Route

                path="/store"

                element={

                  <RoleGuard roles={[UserRole.STORE_INCHARGE]}>

                    <StoreHomePage />

                  </RoleGuard>

                }

              />

              <Route

                path="/pm"

                element={

                  <RoleGuard roles={[UserRole.PROJECT_MANAGER]}>

                    <PMHomePage />

                  </RoleGuard>

                }

              />

              <Route

                path="/executive"

                element={

                  <RoleGuard roles={[UserRole.EXECUTIVE]}>

                    <ExecutiveHomePage />

                  </RoleGuard>

                }

              />

              <Route
                path="/coordinator"
                element={
                  <RoleGuard roles={[UserRole.COORDINATOR]}>
                    <CoordinatorHomePage />
                  </RoleGuard>
                }
              />

              <Route
                path="/coordinator/verify-pos"
                element={
                  <RoleGuard roles={[UserRole.COORDINATOR]}>
                    <CoordinatorVerifyPOsPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/coordinator/grn"
                element={
                  <RoleGuard roles={[UserRole.COORDINATOR]}>
                    <GrnReceivePage />
                  </RoleGuard>
                }
              />

              <Route
                path="/coordinator/verify-wos"
                element={
                  <RoleGuard roles={[UserRole.COORDINATOR]}>
                    <CoordinatorVerifyWOsPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/chairman"
                element={
                  <RoleGuard roles={[UserRole.CHAIRMAN]}>
                    <ChairmanHomePage />
                  </RoleGuard>
                }
              />

              <Route
                path="/chairman/approve-pos"
                element={
                  <RoleGuard roles={[UserRole.CHAIRMAN]}>
                    <ChairmanApprovePOsPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/chairman/approve-wos"
                element={
                  <RoleGuard roles={[UserRole.CHAIRMAN]}>
                    <ChairmanApproveWOsPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/chairman/user-analytics"
                element={
                  <RoleGuard capability="VIEW_USER_ANALYTICS">
                    <UserAnalyticsPage />
                  </RoleGuard>
                }
              />



              <Route path="/notifications" element={<NotificationsPage />} />

              <Route path="/profile" element={<ProfilePage />} />

              <Route
                path="/admin/users"
                element={
                  <RoleGuard systemAdmin>
                    <UserProvisioningPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/admin/projects"
                element={
                  <RoleGuard capability="MANAGE_PROJECTS">
                    <ProjectAdminPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/admin/vendors"
                element={
                  <RoleGuard capability="MANAGE_VENDORS">
                    <VendorAdminPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/materials/new"
                element={
                  <RoleGuard capability="CREATE_INVENTORY_ITEM">
                    <CreateMaterialPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/incidents"
                element={
                  <RoleGuard
                    capabilities={['CREATE_MATERIAL_REQUEST', 'VIEW_INCIDENTS', 'VIEW_ALL_PROJECTS']}
                    match="any"
                  >
                    <IncidentsPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/pm/material-indents"
                element={
                  <RoleGuard roles={[UserRole.PROJECT_MANAGER]}>
                    <IncidentsPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/executive/material-indents"
                element={
                  <RoleGuard roles={[UserRole.EXECUTIVE]}>
                    <IncidentsPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/executive/procurement-decisions"
                element={
                  <RoleGuard roles={[UserRole.EXECUTIVE]}>
                    <ProcurementDecisionsListPage
                      basePath="/executive/procurement-decisions"
                      title="Procurement Decisions"
                      subtitle="Select purchase order or branch transfer before Coordinator approval"
                      emptyTitle="No pending procurement decisions"
                      emptyDescription="Indents forwarded to Head Office will appear here."
                    />
                  </RoleGuard>
                }
              />

              <Route
                path="/executive/procurement-decisions/:id"
                element={
                  <RoleGuard roles={[UserRole.EXECUTIVE]}>
                    <ProcurementDecisionDetailPage listPath="/executive/procurement-decisions" />
                  </RoleGuard>
                }
              />

              <Route
                path="/executive/finance"
                element={
                  <RoleGuard capability="VIEW_FINANCE">
                    <FinancePage />
                  </RoleGuard>
                }
              />

              <Route
                path="/coordinator/finance"
                element={
                  <RoleGuard roles={[UserRole.COORDINATOR]}>
                    <FinancePage />
                  </RoleGuard>
                }
              />

              <Route
                path="/chairman/finance"
                element={
                  <RoleGuard roles={[UserRole.CHAIRMAN]}>
                    <FinancePage />
                  </RoleGuard>
                }
              />

              <Route
                path="/executive/vendors/new"
                element={
                  <RoleGuard capability="CREATE_VENDOR">
                    <VendorAdminPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/executive/purchase-requests"
                element={
                  <RoleGuard roles={[UserRole.EXECUTIVE]}>
                    <ExecutivePurchaseRequestsPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/executive/purchase-requests/:id"
                element={
                  <RoleGuard roles={[UserRole.EXECUTIVE]}>
                    <ExecutivePurchaseRequestDetailPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/coordinator/procurement-decisions"
                element={
                  <RoleGuard roles={[UserRole.COORDINATOR, UserRole.CHAIRMAN]}>
                    <ProcurementDecisionsListPage
                      basePath="/coordinator/procurement-decisions"
                      title="Procurement Decisions"
                      subtitle="Review executive recommendations — approve, modify, or reject"
                      emptyTitle="No decisions awaiting approval"
                      emptyDescription="Executive procurement decisions will appear here."
                    />
                  </RoleGuard>
                }
              />

              <Route
                path="/coordinator/procurement-decisions/:id"
                element={
                  <RoleGuard roles={[UserRole.COORDINATOR, UserRole.CHAIRMAN]}>
                    <ProcurementDecisionDetailPage listPath="/coordinator/procurement-decisions" />
                  </RoleGuard>
                }
              />

              <Route
                path="/coordinator/material-indents"
                element={
                  <RoleGuard roles={[UserRole.COORDINATOR]}>
                    <IncidentsPage />
                  </RoleGuard>
                }
              />



              <Route

                path="/store/stock"

                element={

                  <RoleGuard
                    roles={[
                      UserRole.STORE_INCHARGE,
                      UserRole.PROJECT_MANAGER,
                      UserRole.COORDINATOR,
                      UserRole.CHAIRMAN,
                      UserRole.EXECUTIVE,
                    ]}
                  >

                    <StockPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/store/requests"

                element={

                  <RoleGuard roles={[UserRole.STORE_INCHARGE]}>

                    <StorePendingRequestsPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/store/completed"

                element={

                  <RoleGuard roles={[UserRole.STORE_INCHARGE]}>

                    <StoreCompleteIndentsPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/store/verify-delivery"

                element={

                  <RoleGuard roles={[UserRole.STORE_INCHARGE]}>

                    <VerifyDeliveryPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/store/grn"

                element={

                  <RoleGuard roles={[UserRole.STORE_INCHARGE]}>

                    <GrnReceivePage />

                  </RoleGuard>

                }

              />

              <Route

                path="/store/issue"

                element={

                  <RoleGuard roles={[UserRole.STORE_INCHARGE]}>

                    <IssueMaterialPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/pm/approvals"

                element={

                  <RoleGuard roles={[UserRole.PROJECT_MANAGER]}>

                    <PMApprovalsPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/pm/approve-pos"

                element={

                  <RoleGuard roles={[UserRole.PROJECT_MANAGER]}>

                    <PMPOApprovalsPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/pm/po/:id"

                element={

                  <RoleGuard roles={[UserRole.PROJECT_MANAGER]}>

                    <PODetailPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/pm/purchase-requests"

                element={

                  <RoleGuard roles={[UserRole.PROJECT_MANAGER]}>

                    <PMPurchaseRequestsPage />

                  </RoleGuard>

                }

              />

              <Route
                path="/store/branch-transfers"
                element={<Navigate to="/store" replace />}
              />

              <Route
                path="/pm/branch-transfer-requests"
                element={
                  <RoleGuard roles={[UserRole.PROJECT_MANAGER]}>
                    <PMBranchTransferRequestsPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/pm/branch-transfer-approvals"
                element={<Navigate to="/pm/branch-transfer-requests" replace />}
              />

              <Route
                path="/branch-transfers/:id"
                element={
                  <RoleGuard
                    roles={[
                      UserRole.PROJECT_MANAGER,
                      UserRole.COORDINATOR,
                      UserRole.EXECUTIVE,
                      UserRole.CHAIRMAN,
                    ]}
                  >
                    <BranchTransferDetailPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/pm/branch-transfers"
                element={<Navigate to="/pm/branch-transfer-requests" replace />}
              />

              <Route
                path="/executive/branch-transfers"
                element={
                  <RoleGuard roles={[UserRole.EXECUTIVE]}>
                    <BranchTransfersPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/coordinator/branch-transfers"
                element={
                  <RoleGuard roles={[UserRole.COORDINATOR]}>
                    <BranchTransfersPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/chairman/branch-transfers"
                element={
                  <RoleGuard roles={[UserRole.CHAIRMAN]}>
                    <BranchTransfersPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/pm/approve-wos"
                element={
                  <RoleGuard roles={[UserRole.PROJECT_MANAGER]}>
                    <PMApproveWOsPage />
                  </RoleGuard>
                }
              />

              <Route
                path="/executive/review-wos"
                element={
                  <RoleGuard roles={[UserRole.EXECUTIVE]}>
                    <ExecutiveReviewWOsPage />
                  </RoleGuard>
                }
              />

              <Route

                path="/executive/wo/new"

                element={

                  <RoleGuard roles={[UserRole.EXECUTIVE]}>

                    <CreateWorkOrderPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/work-orders/:id"

                element={

                  <RoleGuard

                    roles={[

                      UserRole.EXECUTIVE,

                      UserRole.COORDINATOR,

                      UserRole.CHAIRMAN,

                      UserRole.PROJECT_MANAGER,

                    ]}

                  >

                    <WorkOrderDetailPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/coordinator/wo/:id"

                element={

                  <RoleGuard roles={[UserRole.COORDINATOR]}>

                    <WorkOrderDetailPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/chairman/wo/:id"

                element={

                  <RoleGuard roles={[UserRole.CHAIRMAN]}>

                    <WorkOrderDetailPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/executive/po/new"

                element={

                  <RoleGuard roles={[UserRole.EXECUTIVE]}>

                    <POWizardPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/purchase-orders/:id"

                element={

                  <RoleGuard

                    roles={[

                      UserRole.EXECUTIVE,

                      UserRole.COORDINATOR,

                      UserRole.CHAIRMAN,

                    ]}

                  >

                    <PODetailPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/chairman/po/:id"

                element={

                  <RoleGuard roles={[UserRole.CHAIRMAN]}>

                    <PODetailPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/coordinator/po/:id"

                element={

                  <RoleGuard roles={[UserRole.COORDINATOR]}>

                    <PODetailPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/explorer"

                element={

                  <RoleGuard capability="VIEW_ALL_PROJECTS">

                    <ExplorerPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/vendors"

                element={

                  <RoleGuard roles={[UserRole.EXECUTIVE, UserRole.COORDINATOR, UserRole.CHAIRMAN]}>

                    <VendorsListPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/vendors/:id"

                element={

                  <RoleGuard roles={[UserRole.EXECUTIVE, UserRole.COORDINATOR, UserRole.CHAIRMAN]}>

                    <VendorScorecardPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/audit-logs"

                element={

                  <RoleGuard capability="VIEW_AUDIT_LOGS">

                    <AuditLogViewerPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/request/new"

                element={

                  <RoleGuard capability="CREATE_MATERIAL_REQUEST">

                    <RequestWizardPage />

                  </RoleGuard>

                }

              />

              <Route path="/site/request/new" element={<Navigate to="/request/new" replace />} />

              <Route

                path="/requests"

                element={

                  <RoleGuard

                    roles={[

                      UserRole.SITE_INCHARGE,

                      UserRole.PROJECT_MANAGER,

                      UserRole.STORE_INCHARGE,

                    ]}

                  >

                    <MyRequestsPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/requests/:id"

                element={

                  <RoleGuard

                    roles={[

                      UserRole.SITE_INCHARGE,

                      UserRole.PROJECT_MANAGER,

                      UserRole.STORE_INCHARGE,

                    ]}

                  >

                    <RequestDetailPage />

                  </RoleGuard>

                }

              />

              <Route

                path="/store/allocate/:id"

                element={

                  <RoleGuard roles={[UserRole.STORE_INCHARGE]}>

                    <AllocateFlowPage />

                  </RoleGuard>

                }

              />

              {/* Legacy role home alias */}

              <Route path="/role-home" element={<RoleHomePage />} />

            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>

        </SocketProvider>

      </BrowserRouter>

      <Toaster position="top-right" richColors closeButton />

    </QueryClientProvider>

  );

}


