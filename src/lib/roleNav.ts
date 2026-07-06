import {

  LayoutDashboard,

  Bell,

  User,

  FilePlus,

  FileText,

  Package,

  CheckSquare,

  ShoppingCart,

  Compass,

  FileStack,

  Users,

  HardHat,

  Building2,

  Truck,

  BarChart3,

  Shield,

  ClipboardCheck,

  type LucideIcon,

} from 'lucide-react';

import { UserRole } from '@afios/shared';

import { getRoleHomePath } from '@/lib/rolePaths';



export interface NavShortcut {

  id: string;

  label: string;

  sublabel?: string;

  href: string;

  icon: LucideIcon;

}



export function getRoleNavShortcuts(role: UserRole): NavShortcut[] {

  const home = getRoleHomePath(role);

  const common: NavShortcut[] = [

    { id: 'home', label: 'Dashboard', sublabel: 'Role home', href: home, icon: LayoutDashboard },

    { id: 'notifications', label: 'Notifications', href: '/notifications', icon: Bell },

    { id: 'profile', label: 'Profile', href: '/profile', icon: User },

  ];



  switch (role) {

    case UserRole.SITE_INCHARGE:

      return [

        ...common,

        { id: 'new-request', label: 'Request material', href: '/request/new', icon: FilePlus },

        { id: 'my-requests', label: 'My indents', href: '/incidents', icon: FileText },

        { id: 'explorer', label: 'Explorer', href: '/explorer', icon: Compass },

      ];

    case UserRole.STORE_INCHARGE:

      return [

        ...common,

        { id: 'add-material', label: 'Product catalog', href: '/materials/new', icon: Package },

        { id: 'new-request', label: 'Request material', href: '/request/new', icon: FilePlus },

        { id: 'pending', label: 'Pending indents', href: '/store/requests', icon: FileText },

        { id: 'completed', label: 'Complete indents', href: '/store/completed', icon: CheckSquare },

        { id: 'verify-delivery', label: 'Verify delivery', href: '/store/verify-delivery', icon: Package },

        { id: 'grn', label: 'Material receipt (GRN)', href: '/store/grn', icon: Package },

        { id: 'issue', label: 'Issue to site', href: '/store/issue', icon: FilePlus },

        { id: 'stock', label: 'Stock Inventory', href: '/store/stock', icon: Package },

        { id: 'finance', label: 'Finance & Tally', href: '/store/finance', icon: BarChart3 },

        { id: 'explorer', label: 'Explorer', href: '/explorer', icon: Compass },

      ];

    case UserRole.PROJECT_MANAGER:

      return [

        ...common,

        { id: 'add-material', label: 'Product catalog', href: '/materials/new', icon: Package },

        { id: 'material-lookup', label: 'Material search', href: '/pm/material-lookup', icon: Package },

        { id: 'approvals', label: 'Indent approvals', href: '/pm/approvals', icon: CheckSquare },

        { id: 'po-approvals', label: 'Approve POs (PM band)', href: '/pm/approve-pos', icon: ShoppingCart },

        { id: 'incidents', label: 'Material indents', href: '/pm/material-indents', icon: FileText },

        { id: 'purchase-requests', label: 'Purchase requests', href: '/pm/purchase-requests', icon: FilePlus },

        { id: 'branch-transfer', label: 'Branch transfer requests', href: '/pm/branch-transfer-requests', icon: Truck },

        { id: 'approve-wos', label: 'Approve work orders', href: '/pm/approve-wos', icon: HardHat },

        { id: 'stock', label: 'Stock Inventory', href: '/store/stock', icon: Package },

        { id: 'finance', label: 'Finance & Tally', href: '/pm/finance', icon: BarChart3 },

        { id: 'explorer', label: 'Explorer', href: '/explorer', icon: Compass },

      ];

    case UserRole.EXECUTIVE:

      return [

        ...common,

        { id: 'incidents', label: 'Material indents', href: '/executive/material-indents', icon: FileText },

        { id: 'ho-indents', label: 'Generate indent (HO)', href: '/executive/ho-indents', icon: FilePlus },

        { id: 'procurement-decisions', label: 'Procurement Decisions', href: '/executive/procurement-decisions', icon: ClipboardCheck },

        { id: 'purchase-requests', label: 'Pending purchase requests', href: '/executive/purchase-requests', icon: FilePlus },

        { id: 'create-po', label: 'Create PO', href: '/executive/po/new', icon: ShoppingCart },

        { id: 'create-wo', label: 'Generate WO', href: '/executive/wo/new', icon: HardHat },

        { id: 'review-wos', label: 'Review work orders', href: '/executive/review-wos', icon: HardHat },

        { id: 'vendors', label: 'Vendors', href: '/vendors', icon: Users },

        { id: 'create-vendor', label: 'Add vendor', href: '/executive/vendors/new', icon: Users },

        { id: 'finance', label: 'Finance & Tally', href: '/executive/finance', icon: BarChart3 },

        { id: 'stock', label: 'Stock Inventory', href: '/store/stock', icon: Package },

        { id: 'branch-transfers', label: 'Branch transfer dashboard', href: '/executive/branch-transfers', icon: Truck },

        { id: 'explorer', label: 'Explorer', href: '/explorer', icon: Compass },

      ];

    case UserRole.COORDINATOR:

      return [

        ...common,

        { id: 'verify-po', label: 'Verify POs', href: '/coordinator/verify-pos', icon: Shield },

        { id: 'procurement-decisions', label: 'Procurement Decisions', href: '/coordinator/procurement-decisions', icon: ClipboardCheck },

        { id: 'ho-indents', label: 'HO indent approvals', href: '/coordinator/ho-indents', icon: FilePlus },

        { id: 'grn', label: 'Material receipt (GRN)', href: '/coordinator/grn', icon: Package },

        { id: 'grn-approvals', label: 'GRN on hold', href: '/coordinator/grn-approvals', icon: Shield },

        { id: 'verify-wo', label: 'Approve WOs', href: '/coordinator/verify-wos', icon: HardHat },

        { id: 'branch-transfers', label: 'Branch transfer approvals', href: '/coordinator/branch-transfers', icon: Truck },

        { id: 'projects', label: 'Projects', href: '/admin/projects', icon: Building2 },

        { id: 'vendors', label: 'Vendors', href: '/admin/vendors', icon: Truck },

        { id: 'settings', label: 'Admin settings', href: '/admin/settings', icon: Shield },

        { id: 'finance', label: 'Finance & Tally', href: '/coordinator/finance', icon: BarChart3 },

        { id: 'incidents', label: 'Material indents', href: '/coordinator/material-indents', icon: FileText },

        { id: 'add-material', label: 'Product catalog', href: '/materials/new', icon: Package },

        { id: 'stock', label: 'Stock Inventory', href: '/store/stock', icon: Package },

        { id: 'audit', label: 'Audit log', href: '/audit-logs', icon: FileStack },

        { id: 'explorer', label: 'Explorer', href: '/explorer', icon: Compass },

      ];

    case UserRole.CHAIRMAN:

      return [

        ...common,

        { id: 'approvals', label: 'Approve POs', href: '/chairman/approve-pos', icon: CheckSquare },

        { id: 'grn-approvals', label: 'GRN on hold', href: '/chairman/grn-approvals', icon: Package },

        { id: 'approve-wos', label: 'Approve work orders', href: '/chairman/approve-wos', icon: HardHat },

        { id: 'stock', label: 'Stock Inventory', href: '/store/stock', icon: Package },

        { id: 'branch-transfers', label: 'Branch transfer monitoring', href: '/chairman/branch-transfers', icon: Truck },

        { id: 'user-analytics', label: 'User analytics', href: '/chairman/user-analytics', icon: BarChart3 },

        { id: 'settings', label: 'Admin settings', href: '/admin/settings', icon: Shield },

        { id: 'finance', label: 'Finance & Tally', href: '/chairman/finance', icon: BarChart3 },

        { id: 'explorer', label: 'Explorer', href: '/explorer', icon: Compass },

        { id: 'audit', label: 'Audit log', href: '/audit-logs', icon: FileStack },

      ];

    default:

      return common;

  }

}


