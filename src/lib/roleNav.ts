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

      ];

    case UserRole.STORE_INCHARGE:

      return [

        ...common,

        { id: 'add-material', label: 'Product catalog', href: '/materials/new', icon: Package },

        { id: 'pending', label: 'Pending indents', href: '/store/requests', icon: FileText },

        { id: 'completed', label: 'Complete indents', href: '/store/completed', icon: CheckSquare },

        { id: 'verify-delivery', label: 'Verify delivery', href: '/store/verify-delivery', icon: Package },

        { id: 'grn', label: 'Material receipt (GRN)', href: '/store/grn', icon: Package },

        { id: 'branch-transfers', label: 'Branch transfers', href: '/store/branch-transfers', icon: Truck },

        { id: 'issue', label: 'Issue to site', href: '/store/issue', icon: FilePlus },

        { id: 'stock', label: 'Stock Inventory', href: '/store/stock', icon: Package },

      ];

    case UserRole.PROJECT_MANAGER:

      return [

        ...common,

        { id: 'add-material', label: 'Product catalog', href: '/materials/new', icon: Package },

        { id: 'approvals', label: 'Indent approvals', href: '/pm/approvals', icon: CheckSquare },

        { id: 'po-approvals', label: 'Approve POs (under ₹5k)', href: '/pm/approve-pos', icon: ShoppingCart },

        { id: 'incidents', label: 'Material indents', href: '/pm/material-indents', icon: FileText },

        { id: 'purchase-requests', label: 'Purchase requests', href: '/pm/purchase-requests', icon: FilePlus },

        { id: 'branch-transfer', label: 'Branch transfer approvals', href: '/pm/branch-transfer-approvals', icon: Truck },

        { id: 'approve-wos', label: 'Approve work orders', href: '/pm/approve-wos', icon: HardHat },

      ];

    case UserRole.EXECUTIVE:

      return [

        ...common,

        { id: 'incidents', label: 'Material indents', href: '/executive/material-indents', icon: FileText },

        { id: 'create-po', label: 'Create PO', href: '/executive/po/new', icon: ShoppingCart },

        { id: 'create-wo', label: 'Generate WO', href: '/executive/wo/new', icon: HardHat },

        { id: 'review-wos', label: 'Review work orders', href: '/executive/review-wos', icon: HardHat },

        { id: 'vendors', label: 'Vendors', href: '/vendors', icon: Users },

        { id: 'users', label: 'Manage users', href: '/admin/users', icon: Users },

        { id: 'audit', label: 'Audit log', href: '/audit-logs', icon: FileStack },

        { id: 'explorer', label: 'Explorer', href: '/explorer', icon: Compass },

      ];

    case UserRole.COORDINATOR:

      return [

        ...common,

        { id: 'verify-po', label: 'Verify POs', href: '/coordinator/verify-pos', icon: Shield },

        { id: 'grn', label: 'Material receipt (GRN)', href: '/coordinator/grn', icon: Package },

        { id: 'verify-wo', label: 'Approve WOs', href: '/coordinator/verify-wos', icon: HardHat },

        { id: 'branch-transfers', label: 'Branch transfers', href: '/coordinator/branch-transfers', icon: Truck },

        { id: 'projects', label: 'Projects', href: '/admin/projects', icon: Building2 },

        { id: 'vendors', label: 'Vendors', href: '/admin/vendors', icon: Truck },

        { id: 'users', label: 'Manage users', href: '/admin/users', icon: Users },

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

        { id: 'approve-wos', label: 'Approve work orders', href: '/chairman/approve-wos', icon: HardHat },

        { id: 'stock', label: 'Stock Inventory', href: '/store/stock', icon: Package },

        { id: 'user-analytics', label: 'User analytics', href: '/chairman/user-analytics', icon: BarChart3 },

        { id: 'explorer', label: 'Explorer', href: '/explorer', icon: Compass },

        { id: 'audit', label: 'Audit log', href: '/audit-logs', icon: FileStack },

      ];

    default:

      return common;

  }

}


