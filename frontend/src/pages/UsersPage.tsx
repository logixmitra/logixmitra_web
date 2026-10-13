// // import { useState } from "react";
// // import DashboardLayout from "@/components/DashboardLayout";
// // import { Card } from "@/components/ui/card";
// // import { Button } from "@/components/ui/button";
// // import { Input } from "@/components/ui/input";
// // import { Label } from "@/components/ui/label";
// // import { Badge } from "@/components/ui/badge";
// // import { Checkbox } from "@/components/ui/checkbox";
// // import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// // import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// // import { Search, Plus, Edit2, RefreshCw, Trash2, Download } from "lucide-react";
// // import { mockRoles, type User } from "@/data/mockData";
// // import { useToast } from "@/hooks/use-toast";

// // interface ExtendedUser extends User {
// //   mobile: string;
// // }

// // const initialUsers: ExtendedUser[] = [
// //   { id: "u1", name: "admin", email: "admin@erp.com", mobile: "9999999999", role: "Admin", status: "active", joinedAt: "2024-01-15" },
// //   { id: "u2", name: "Administrator", email: "admin@gmail.com", mobile: "8960628923", role: "Admin", status: "active", joinedAt: "2024-02-20" },
// //   { id: "u3", name: "Amit Patel", email: "amit@logixmitra.com", mobile: "9876543210", role: "Finance Manager", status: "active", joinedAt: "2024-03-10" },
// //   { id: "u4", name: "Sneha Gupta", email: "sneha@seller.com", mobile: "9123456789", role: "Seller", status: "active", joinedAt: "2024-04-05" },
// //   { id: "u5", name: "Vikram Singh", email: "vikram@seller.com", mobile: "9234567890", role: "Seller", status: "blocked", joinedAt: "2024-05-12" },
// //   { id: "u6", name: "Ananya Reddy", email: "ananya@logixmitra.com", mobile: "9345678901", role: "Support Agent", status: "active", joinedAt: "2024-06-01" },
// //   { id: "u7", name: "Karan Mehta", email: "karan@user.com", mobile: "9456789012", role: "Manager", status: "active", joinedAt: "2024-07-18" },
// //   { id: "u8", name: "Divya Joshi", email: "divya@logixmitra.com", mobile: "9567890123", role: "Admin", status: "active", joinedAt: "2024-08-22" },
// // ];

// // const UsersPage = () => {
// //   const [users, setUsers] = useState<ExtendedUser[]>(initialUsers);
// //   const [search, setSearch] = useState("");
// //   const [roleFilter, setRoleFilter] = useState("all");
// //   const [selectedIds, setSelectedIds] = useState<string[]>([]);
// //   const [isDialogOpen, setIsDialogOpen] = useState(false);
// //   const [editingUser, setEditingUser] = useState<ExtendedUser | null>(null);
// //   const [formName, setFormName] = useState("");
// //   const [formEmail, setFormEmail] = useState("");
// //   const [formMobile, setFormMobile] = useState("");
// //   const [formRole, setFormRole] = useState("");
// //   const { toast } = useToast();

// //   const filtered = users.filter((u) => {
// //     const matchSearch =
// //       u.name.toLowerCase().includes(search.toLowerCase()) ||
// //       u.email.toLowerCase().includes(search.toLowerCase()) ||
// //       u.mobile.includes(search);
// //     const matchRole = roleFilter === "all" || u.role === roleFilter;
// //     return matchSearch && matchRole;
// //   });

// //   const allRoleNames = [...new Set(users.map((u) => u.role))];

// //   const toggleSelect = (id: string) => {
// //     setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
// //   };

// //   const toggleAll = () => {
// //     if (selectedIds.length === filtered.length) {
// //       setSelectedIds([]);
// //     } else {
// //       setSelectedIds(filtered.map((u) => u.id));
// //     }
// //   };

// //   const openCreate = () => {
// //     setEditingUser(null);
// //     setFormName("");
// //     setFormEmail("");
// //     setFormMobile("");
// //     setFormRole("");
// //     setIsDialogOpen(true);
// //   };

// //   const openEdit = (user: ExtendedUser) => {
// //     setEditingUser(user);
// //     setFormName(user.name);
// //     setFormEmail(user.email);
// //     setFormMobile(user.mobile);
// //     setFormRole(user.role);
// //     setIsDialogOpen(true);
// //   };

// //   const handleSave = () => {
// //     if (!formName.trim() || !formEmail.trim() || !formRole) return;
// //     if (editingUser) {
// //       setUsers((prev) =>
// //         prev.map((u) =>
// //           u.id === editingUser.id ? { ...u, name: formName, email: formEmail, mobile: formMobile, role: formRole } : u
// //         )
// //       );
// //       toast({ title: "User updated" });
// //     } else {
// //       setUsers((prev) => [
// //         ...prev,
// //         {
// //           id: `u${Date.now()}`,
// //           name: formName,
// //           email: formEmail,
// //           mobile: formMobile,
// //           role: formRole,
// //           status: "active" as const,
// //           joinedAt: new Date().toISOString().split("T")[0],
// //         },
// //       ]);
// //       toast({ title: "User created" });
// //     }
// //     setIsDialogOpen(false);
// //   };

// //   const handleDelete = (id: string) => {
// //     setUsers((prev) => prev.filter((u) => u.id !== id));
// //     toast({ title: "User deleted" });
// //   };

// //   const exportPDF = () => {
// //     toast({ title: "Export PDF", description: "PDF export triggered (mock)" });
// //   };

// //   return (
// //     <DashboardLayout title="Users Management" subtitle="Manage users and assign roles">
// //       <div className="space-y-5">
// //         {/* Top actions */}
// //         <div className="flex items-center justify-between gap-4">
// //           <div />
// //           <div className="flex items-center gap-3">
// //             <Button onClick={openCreate} className="bg-primary text-primary-foreground gap-2">
// //               <Plus className="h-4 w-4" /> Add User
// //             </Button>
// //             <Button variant="outline" onClick={exportPDF} className="gap-2">
// //               <Download className="h-4 w-4" /> Export PDF
// //             </Button>
// //           </div>
// //         </div>

// //         {/* Search & Filter */}
// //         <div className="flex items-center gap-4">
// //           <div className="relative flex-1">
// //             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
// //             <Input
// //               placeholder="Search by name, email, or mobile..."
// //               value={search}
// //               onChange={(e) => setSearch(e.target.value)}
// //               className="pl-10"
// //             />
// //           </div>
// //           <Select value={roleFilter} onValueChange={setRoleFilter}>
// //             <SelectTrigger className="w-44">
// //               <SelectValue placeholder="All Roles" />
// //             </SelectTrigger>
// //             <SelectContent>
// //               <SelectItem value="all">All Roles</SelectItem>
// //               {allRoleNames.map((r) => (
// //                 <SelectItem key={r} value={r}>{r}</SelectItem>
// //               ))}
// //             </SelectContent>
// //           </Select>
// //         </div>

// //         <p className="text-sm text-primary">
// //           Showing {filtered.length} of {users.length} users
// //         </p>

// //         {/* Users Table */}
// //         <Card className="shadow-card overflow-hidden">
// //           <div className="overflow-x-auto">
// //             <table className="w-full">
// //               <thead>
// //                 <tr className="border-b border-border bg-muted/30">
// //                   <th className="py-3.5 px-4 w-10">
// //                     <Checkbox
// //                       checked={selectedIds.length === filtered.length && filtered.length > 0}
// //                       onCheckedChange={toggleAll}
// //                     />
// //                   </th>
// //                   <th className="text-left py-3.5 px-4 text-sm font-semibold text-muted-foreground">Username</th>
// //                   <th className="text-left py-3.5 px-4 text-sm font-semibold text-muted-foreground">Email</th>
// //                   <th className="text-left py-3.5 px-4 text-sm font-semibold text-muted-foreground">Mobile</th>
// //                   <th className="text-left py-3.5 px-4 text-sm font-semibold text-muted-foreground">Roles</th>
// //                   <th className="text-right py-3.5 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
// //                 </tr>
// //               </thead>
// //               <tbody>
// //                 {filtered.map((user) => (
// //                   <tr key={user.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
// //                     <td className="py-3.5 px-4">
// //                       <Checkbox
// //                         checked={selectedIds.includes(user.id)}
// //                         onCheckedChange={() => toggleSelect(user.id)}
// //                       />
// //                     </td>
// //                     <td className="py-3.5 px-4 text-sm font-medium text-foreground">{user.name}</td>
// //                     <td className="py-3.5 px-4 text-sm text-primary">{user.email}</td>
// //                     <td className="py-3.5 px-4 text-sm text-foreground">{user.mobile}</td>
// //                     <td className="py-3.5 px-4">
// //                       <Badge variant="secondary" className="text-xs font-medium">{user.role}</Badge>
// //                     </td>
// //                     <td className="py-3.5 px-4">
// //                       <div className="flex items-center justify-end gap-1">
// //                         <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => openEdit(user)} title="Edit">
// //                           <Edit2 className="h-4 w-4" />
// //                         </Button>
// //                         <Button variant="outline" size="icon" className="h-9 w-9" title="Reset">
// //                           <RefreshCw className="h-4 w-4" />
// //                         </Button>
// //                         <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleDelete(user.id)} title="Delete">
// //                           <Trash2 className="h-4 w-4" />
// //                         </Button>
// //                       </div>
// //                     </td>
// //                   </tr>
// //                 ))}
// //                 {filtered.length === 0 && (
// //                   <tr>
// //                     <td colSpan={6} className="py-12 text-center text-muted-foreground">No users found.</td>
// //                   </tr>
// //                 )}
// //               </tbody>
// //             </table>
// //           </div>
// //         </Card>

// //         {/* Add/Edit User Dialog */}
// //         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
// //           <DialogContent className="max-w-md">
// //             <DialogHeader>
// //               <DialogTitle className="font-display text-xl">
// //                 {editingUser ? "Edit User" : "Add New User"}
// //               </DialogTitle>
// //             </DialogHeader>
// //             <div className="space-y-4 mt-2">
// //               <div className="space-y-2">
// //                 <Label>Username</Label>
// //                 <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Enter username" />
// //               </div>
// //               <div className="space-y-2">
// //                 <Label>Email</Label>
// //                 <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="Enter email" type="email" />
// //               </div>
// //               <div className="space-y-2">
// //                 <Label>Mobile</Label>
// //                 <Input value={formMobile} onChange={(e) => setFormMobile(e.target.value)} placeholder="Enter mobile number" />
// //               </div>
// //               <div className="space-y-2">
// //                 <Label>Role</Label>
// //                 <Select value={formRole} onValueChange={setFormRole}>
// //                   <SelectTrigger>
// //                     <SelectValue placeholder="Select a role" />
// //                   </SelectTrigger>
// //                   <SelectContent>
// //                     {mockRoles.map((role) => (
// //                       <SelectItem key={role.id} value={role.name}>{role.name}</SelectItem>
// //                     ))}
// //                   </SelectContent>
// //                 </Select>
// //               </div>
// //               <div className="flex justify-end gap-3 pt-2">
// //                 <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
// //                 <Button onClick={handleSave} className="bg-primary text-primary-foreground" disabled={!formName.trim() || !formEmail.trim() || !formRole}>
// //                   {editingUser ? "Update" : "Create"}
// //                 </Button>
// //               </div>
// //             </div>
// //           </DialogContent>
// //         </Dialog>
// //       </div>
// //     </DashboardLayout>
// //   );
// // };

// // export default UsersPage;



// import { useState, useEffect } from "react";
// import DashboardLayout from "@/components/DashboardLayout";
// import { Card } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Badge } from "@/components/ui/badge";
// import { Checkbox } from "@/components/ui/checkbox";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
// import { Search, Plus, Edit2, RefreshCw, Trash2, Download, MoreVertical, Power, Key } from "lucide-react";
// import { useToast } from "@/hooks/use-toast";
// import { Skeleton } from "@/components/ui/skeleton";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import apiService from "../../services/api"; // Import your API service

// // User type based on backend response
// interface User {
//   id: number;
//   name: string;
//   email: string;
//   mobile: string;
//   role: string;
//   roleId: number;
//   avatar: string;
//   isActive: boolean;
//   status: string;
//   createdAt: string | null;
//   lastLogin: string | null;
// }

// // Role type for dropdown
// interface Role {
//   id: number;
//   name: string;
//   description?: string;
// }

// const UsersPage = () => {
//   const [users, setUsers] = useState<User[]>([]);
//   const [roles, setRoles] = useState<Role[]>([]);
//   const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [rolesLoading, setRolesLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const [roleFilter, setRoleFilter] = useState("all");
//   const [statusFilter, setStatusFilter] = useState("all");
//   const [selectedIds, setSelectedIds] = useState<number[]>([]);
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//   const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
//   const [userToDelete, setUserToDelete] = useState<User | null>(null);
//   const [editingUser, setEditingUser] = useState<User | null>(null);
  
//   // Form states
//   const [formName, setFormName] = useState("");
//   const [formEmail, setFormEmail] = useState("");
//   const [formMobile, setFormMobile] = useState("");
//   const [formRoleId, setFormRoleId] = useState<number>(4); // Default to user role
//   const [formPassword, setFormPassword] = useState("");
//   const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");
//   const [submitting, setSubmitting] = useState(false);

//   const { toast } = useToast();

//   // Fetch users and roles on component mount
//   useEffect(() => {
//     fetchUsers();
//     fetchRoles();
//   }, []);

//   // Filter users based on search, role, and status
//   useEffect(() => {
//     const filtered = users.filter((u) => {
//       const matchSearch =
//         u.name.toLowerCase().includes(search.toLowerCase()) ||
//         u.email.toLowerCase().includes(search.toLowerCase()) ||
//         (u.mobile && u.mobile.includes(search));
      
//       const matchRole = roleFilter === "all" || u.roleId.toString() === roleFilter;
//       const matchStatus = statusFilter === "all" || u.status === statusFilter;
      
//       return matchSearch && matchRole && matchStatus;
//     });
//     setFilteredUsers(filtered);
//   }, [search, roleFilter, statusFilter, users]);

//   const fetchUsers = async () => {
//     try {
//       setLoading(true);
//       const response = await apiService.getAllUsers();
      
//       if (response.success) {
//         setUsers(response.data);
//       } else {
//         toast({
//           title: "Error",
//           description: response.message || "Failed to fetch users",
//           variant: "destructive",
//         });
//       }
//     } catch (error: any) {
//       console.error('Error fetching users:', error);
//       toast({
//         title: "Error",
//         description: error.message || "Failed to connect to the server",
//         variant: "destructive",
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchRoles = async () => {
//     try {
//       setRolesLoading(true);
//       const response = await apiService.getRoles();
      
//       if (response.success) {
//         setRoles(response.data);
//       }
//     } catch (error) {
//       console.error('Error fetching roles:', error);
//     } finally {
//       setRolesLoading(false);
//     }
//   };

//   const toggleSelect = (id: number) => {
//     setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
//   };

//   const toggleAll = () => {
//     if (selectedIds.length === filteredUsers.length) {
//       setSelectedIds([]);
//     } else {
//       setSelectedIds(filteredUsers.map((u) => u.id));
//     }
//   };

//   const openCreate = () => {
//     setEditingUser(null);
//     setFormName("");
//     setFormEmail("");
//     setFormMobile("");
//     setFormRoleId(4);
//     setFormPassword("");
//     setFormStatus("active");
//     setIsDialogOpen(true);
//   };

//   const openEdit = (user: User) => {
//     setEditingUser(user);
//     setFormName(user.name);
//     setFormEmail(user.email);
//     setFormMobile(user.mobile || "");
//     setFormRoleId(user.roleId);
//     setFormStatus(user.status as "active" | "inactive");
//     setFormPassword(""); // Don't populate password for security
//     setIsDialogOpen(true);
//   };

//   const openDeleteDialog = (user: User) => {
//     setUserToDelete(user);
//     setIsDeleteDialogOpen(true);
//   };

//   const handleSave = async () => {
//     if (!formName.trim() || !formEmail.trim() || !formRoleId) {
//       toast({
//         title: "Validation Error",
//         description: "Please fill in all required fields",
//         variant: "destructive",
//       });
//       return;
//     }

//     // Email validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(formEmail)) {
//       toast({
//         title: "Validation Error",
//         description: "Please enter a valid email address",
//         variant: "destructive",
//       });
//       return;
//     }

//     // Mobile validation (optional but if provided, should be valid)
//     if (formMobile && !/^\d{10}$/.test(formMobile)) {
//       toast({
//         title: "Validation Error",
//         description: "Please enter a valid 10-digit mobile number",
//         variant: "destructive",
//       });
//       return;
//     }

//     // Password validation for new users
//     if (!editingUser && (!formPassword || formPassword.length < 6)) {
//       toast({
//         title: "Validation Error",
//         description: "Password must be at least 6 characters long",
//         variant: "destructive",
//       });
//       return;
//     }

//     try {
//       setSubmitting(true);

//       if (editingUser) {
//         // Update existing user
//         const response = await apiService.updateUser(editingUser.id, {
//           name: formName,
//           email: formEmail,
//           mobile: formMobile,
//           roleId: formRoleId,
//           status: formStatus
//         });

//         if (response.success) {
//           // Update local state
//           setUsers((prev) =>
//             prev.map((u) =>
//               u.id === editingUser.id ? { 
//                 ...u, 
//                 name: formName, 
//                 email: formEmail, 
//                 mobile: formMobile, 
//                 roleId: formRoleId,
//                 role: roles.find(r => r.id === formRoleId)?.name || u.role,
//                 status: formStatus,
//                 isActive: formStatus === 'active'
//               } : u
//             )
//           );
          
//           toast({ 
//             title: "Success", 
//             description: "User updated successfully" 
//           });
//           setIsDialogOpen(false);
//         } else {
//           throw new Error(response.message || 'Update failed');
//         }
//       } else {
//         // Create new user
//         const response = await apiService.createUser({
//           name: formName,
//           email: formEmail,
//           mobile: formMobile,
//           roleId: formRoleId,
//           password: formPassword
//         });

//         if (response.success) {
//           await fetchUsers(); // Refresh the list
//           toast({ 
//             title: "Success", 
//             description: "User created successfully" 
//           });
//           setIsDialogOpen(false);
//         } else {
//           throw new Error(response.message || 'Creation failed');
//         }
//       }
//     } catch (error: any) {
//       console.error('Error saving user:', error);
//       toast({
//         title: "Error",
//         description: error.message || "Failed to save user",
//         variant: "destructive",
//       });
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const handleDelete = async () => {
//     if (!userToDelete) return;

//     try {
//       const response = await apiService.deleteUser(userToDelete.id);

//       if (response.success) {
//         setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
//         setSelectedIds((prev) => prev.filter(id => id !== userToDelete.id));
        
//         toast({ 
//           title: "Success", 
//           description: "User deleted successfully" 
//         });
//         setIsDeleteDialogOpen(false);
//         setUserToDelete(null);
//       } else {
//         throw new Error(response.message || 'Delete failed');
//       }
//     } catch (error: any) {
//       console.error('Error deleting user:', error);
//       toast({
//         title: "Error",
//         description: error.message || "Failed to delete user",
//         variant: "destructive",
//       });
//     }
//   };

//   const handleBulkDelete = async () => {
//     if (selectedIds.length === 0) return;

//     try {
//       // Delete users one by one (you might want to implement a bulk delete endpoint)
//       for (const id of selectedIds) {
//         await apiService.deleteUser(id);
//       }

//       setUsers((prev) => prev.filter((u) => !selectedIds.includes(u.id)));
//       setSelectedIds([]);
      
//       toast({ 
//         title: "Success", 
//         description: `${selectedIds.length} users deleted successfully` 
//       });
//     } catch (error: any) {
//       console.error('Error bulk deleting users:', error);
//       toast({
//         title: "Error",
//         description: error.message || "Failed to delete users",
//         variant: "destructive",
//       });
//     }
//   };

//   const handleResetPassword = async (user: User) => {
//     try {
//       const response = await apiService.resetUserPassword(user.id);

//       if (response.success) {
//         toast({ 
//           title: "Success", 
//           description: `Password reset email sent to ${user.email}` 
//         });
//       } else {
//         throw new Error(response.message || 'Reset failed');
//       }
//     } catch (error: any) {
//       console.error('Error resetting password:', error);
//       toast({
//         title: "Error",
//         description: error.message || "Failed to reset password",
//         variant: "destructive",
//       });
//     }
//   };

//   const handleUpdateStatus = async (user: User, newStatus: 'active' | 'inactive') => {
//     try {
//       const response = await apiService.updateUserStatus(user.id, newStatus);

//       if (response.success) {
//         setUsers((prev) =>
//           prev.map((u) =>
//             u.id === user.id ? { 
//               ...u, 
//               status: newStatus,
//               isActive: newStatus === 'active'
//             } : u
//           )
//         );
        
//         toast({ 
//           title: "Success", 
//           description: `User status updated to ${newStatus}` 
//         });
//       } else {
//         throw new Error(response.message || 'Status update failed');
//       }
//     } catch (error: any) {
//       console.error('Error updating user status:', error);
//       toast({
//         title: "Error",
//         description: error.message || "Failed to update user status",
//         variant: "destructive",
//       });
//     }
//   };

//   const exportCSV = () => {
//     try {
//       // Create CSV content
//       const headers = ['Name', 'Email', 'Mobile', 'Role', 'Status', 'Last Login', 'Created At'];
//       const csvContent = [
//         headers.join(','),
//         ...filteredUsers.map(user => [
//           `"${user.name}"`,
//           `"${user.email}"`,
//           `"${user.mobile || ''}"`,
//           `"${user.role}"`,
//           user.status,
//           user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never',
//           user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'
//         ].join(','))
//       ].join('\n');

//       // Download CSV
//       const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//       const link = document.createElement('a');
//       const url = URL.createObjectURL(blob);
//       link.setAttribute('href', url);
//       link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
//       link.style.visibility = 'hidden';
//       document.body.appendChild(link);
//       link.click();
//       document.body.removeChild(link);

//       toast({ 
//         title: "Success", 
//         description: "Users exported successfully" 
//       });
//     } catch (error) {
//       toast({
//         title: "Error",
//         description: "Failed to export users",
//         variant: "destructive",
//       });
//     }
//   };

//   const getInitials = (name: string) => {
//     return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
//   };

//   const getRoleBadgeColor = (roleName: string) => {
//     switch (roleName.toLowerCase()) {
//       case 'admin':
//         return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
//       case 'manager':
//         return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
//       case 'supervisor':
//         return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
//       default:
//         return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
//     }
//   };

//   return (
//     <DashboardLayout title="Users Management" subtitle="Manage users and assign roles">
//       <div className="space-y-5">
//         {/* Top actions */}
//         <div className="flex items-center justify-between gap-4">
//           <div className="flex items-center gap-2">
//             <Button 
//               variant="outline" 
//               size="sm" 
//               onClick={fetchUsers} 
//               disabled={loading}
//               className="gap-2"
//             >
//               <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
//               Refresh
//             </Button>
//             {selectedIds.length > 0 && (
//               <Button 
//                 variant="destructive" 
//                 size="sm" 
//                 onClick={handleBulkDelete}
//                 className="gap-2"
//               >
//                 <Trash2 className="h-4 w-4" />
//                 Delete Selected ({selectedIds.length})
//               </Button>
//             )}
//           </div>
//           <div className="flex items-center gap-3">
//             <Button onClick={openCreate} className="bg-primary text-primary-foreground gap-2">
//               <Plus className="h-4 w-4" /> Add User
//             </Button>
//             <Button variant="outline" onClick={exportCSV} className="gap-2">
//               <Download className="h-4 w-4" /> Export CSV
//             </Button>
//           </div>
//         </div>

//         {/* Search & Filters */}
//         <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
//           <div className="relative flex-1 w-full">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//             <Input
//               placeholder="Search by name, email, or mobile..."
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               className="pl-10 w-full"
//             />
//           </div>
//           <div className="flex gap-2 w-full sm:w-auto">
//             <Select value={roleFilter} onValueChange={setRoleFilter}>
//               <SelectTrigger className="w-full sm:w-40">
//                 <SelectValue placeholder="All Roles" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Roles</SelectItem>
//                 {rolesLoading ? (
//                   <SelectItem value="loading" disabled>Loading...</SelectItem>
//                 ) : (
//                   roles.map((role) => (
//                     <SelectItem key={role.id} value={role.id.toString()}>
//                       {role.name}
//                     </SelectItem>
//                   ))
//                 )}
//               </SelectContent>
//             </Select>

//             <Select value={statusFilter} onValueChange={setStatusFilter}>
//               <SelectTrigger className="w-full sm:w-40">
//                 <SelectValue placeholder="All Status" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Status</SelectItem>
//                 <SelectItem value="active">Active</SelectItem>
//                 <SelectItem value="inactive">Inactive</SelectItem>
//               </SelectContent>
//             </Select>
//           </div>
//         </div>

//         <p className="text-sm text-primary">
//           Showing {filteredUsers.length} of {users.length} users
//         </p>

//         {/* Users Table */}
//         <Card className="shadow-card overflow-hidden">
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead>
//                 <tr className="border-b border-border bg-muted/30">
//                   <th className="py-3.5 px-4 w-10">
//                     <Checkbox
//                       checked={selectedIds.length === filteredUsers.length && filteredUsers.length > 0}
//                       onCheckedChange={toggleAll}
//                     />
//                   </th>
//                   <th className="text-left py-3.5 px-4 text-sm font-semibold text-muted-foreground">User</th>
//                   <th className="text-left py-3.5 px-4 text-sm font-semibold text-muted-foreground">Email</th>
//                   <th className="text-left py-3.5 px-4 text-sm font-semibold text-muted-foreground">Mobile</th>
//                   <th className="text-left py-3.5 px-4 text-sm font-semibold text-muted-foreground">Role</th>
//                   <th className="text-left py-3.5 px-4 text-sm font-semibold text-muted-foreground">Status</th>
//                   <th className="text-left py-3.5 px-4 text-sm font-semibold text-muted-foreground">Last Login</th>
//                   <th className="text-right py-3.5 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {loading ? (
//                   // Loading skeletons
//                   Array.from({ length: 5 }).map((_, index) => (
//                     <tr key={index} className="border-b border-border/50">
//                       <td className="py-3.5 px-4"><Skeleton className="h-4 w-4" /></td>
//                       <td className="py-3.5 px-4">
//                         <div className="flex items-center gap-3">
//                           <Skeleton className="h-8 w-8 rounded-full" />
//                           <Skeleton className="h-5 w-32" />
//                         </div>
//                       </td>
//                       <td className="py-3.5 px-4"><Skeleton className="h-5 w-40" /></td>
//                       <td className="py-3.5 px-4"><Skeleton className="h-5 w-28" /></td>
//                       <td className="py-3.5 px-4"><Skeleton className="h-5 w-20" /></td>
//                       <td className="py-3.5 px-4"><Skeleton className="h-5 w-16" /></td>
//                       <td className="py-3.5 px-4"><Skeleton className="h-5 w-24" /></td>
//                       <td className="py-3.5 px-4"><Skeleton className="h-8 w-24 ml-auto" /></td>
//                     </tr>
//                   ))
//                 ) : (
//                   filteredUsers.map((user) => (
//                     <tr key={user.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
//                       <td className="py-3.5 px-4">
//                         <Checkbox
//                           checked={selectedIds.includes(user.id)}
//                           onCheckedChange={() => toggleSelect(user.id)}
//                         />
//                       </td>
//                       <td className="py-3.5 px-4">
//                         <div className="flex items-center gap-3">
//                           <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
//                             {user.avatar || getInitials(user.name)}
//                           </div>
//                           <span className="text-sm font-medium text-foreground">{user.name}</span>
//                         </div>
//                       </td>
//                       <td className="py-3.5 px-4 text-sm text-primary">{user.email}</td>
//                       <td className="py-3.5 px-4 text-sm text-foreground">{user.mobile || 'N/A'}</td>
//                       <td className="py-3.5 px-4">
//                         <Badge className={`text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
//                           {user.role}
//                         </Badge>
//                       </td>
//                       <td className="py-3.5 px-4">
//                         <Badge 
//                           variant={user.status === 'active' ? 'success' : 'destructive'} 
//                           className="text-xs"
//                         >
//                           {user.status}
//                         </Badge>
//                       </td>
//                       <td className="py-3.5 px-4 text-sm text-muted-foreground">
//                         {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
//                       </td>
//                       <td className="py-3.5 px-4">
//                         <div className="flex items-center justify-end gap-1">
//                           <Button 
//                             variant="ghost" 
//                             size="icon" 
//                             className="h-8 w-8" 
//                             onClick={() => openEdit(user)} 
//                             title="Edit User"
//                           >
//                             <Edit2 className="h-3.5 w-3.5" />
//                           </Button>
                          
//                           <DropdownMenu>
//                             <DropdownMenuTrigger asChild>
//                               <Button variant="ghost" size="icon" className="h-8 w-8">
//                                 <MoreVertical className="h-3.5 w-3.5" />
//                               </Button>
//                             </DropdownMenuTrigger>
//                             <DropdownMenuContent align="end">
//                               <DropdownMenuLabel>Actions</DropdownMenuLabel>
//                               <DropdownMenuSeparator />
//                               <DropdownMenuItem onClick={() => handleResetPassword(user)}>
//                                 <Key className="mr-2 h-4 w-4" />
//                                 Reset Password
//                               </DropdownMenuItem>
//                               <DropdownMenuItem 
//                                 onClick={() => handleUpdateStatus(
//                                   user, 
//                                   user.status === 'active' ? 'inactive' : 'active'
//                                 )}
//                               >
//                                 <Power className="mr-2 h-4 w-4" />
//                                 {user.status === 'active' ? 'Deactivate' : 'Activate'}
//                               </DropdownMenuItem>
//                               <DropdownMenuSeparator />
//                               <DropdownMenuItem 
//                                 onClick={() => openDeleteDialog(user)}
//                                 className="text-red-600"
//                               >
//                                 <Trash2 className="mr-2 h-4 w-4" />
//                                 Delete
//                               </DropdownMenuItem>
//                             </DropdownMenuContent>
//                           </DropdownMenu>
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//                 {!loading && filteredUsers.length === 0 && (
//                   <tr>
//                     <td colSpan={8} className="py-12 text-center text-muted-foreground">
//                       No users found.
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </Card>

//         {/* Add/Edit User Dialog */}
//         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
//           <DialogContent className="max-w-md">
//             <DialogHeader>
//               <DialogTitle className="font-display text-xl">
//                 {editingUser ? "Edit User" : "Add New User"}
//               </DialogTitle>
//               <DialogDescription>
//                 {editingUser 
//                   ? "Update user information and role" 
//                   : "Create a new user account with specific role"}
//               </DialogDescription>
//             </DialogHeader>
//             <div className="space-y-4 mt-2">
//               <div className="space-y-2">
//                 <Label htmlFor="name">Full Name *</Label>
//                 <Input 
//                   id="name"
//                   value={formName} 
//                   onChange={(e) => setFormName(e.target.value)} 
//                   placeholder="Enter full name"
//                   disabled={submitting}
//                 />
//               </div>
              
//               <div className="space-y-2">
//                 <Label htmlFor="email">Email Address *</Label>
//                 <Input 
//                   id="email"
//                   value={formEmail} 
//                   onChange={(e) => setFormEmail(e.target.value)} 
//                   placeholder="Enter email"
//                   type="email"
//                   disabled={submitting}
//                 />
//               </div>
              
//               <div className="space-y-2">
//                 <Label htmlFor="mobile">Mobile Number</Label>
//                 <Input 
//                   id="mobile"
//                   value={formMobile} 
//                   onChange={(e) => setFormMobile(e.target.value)} 
//                   placeholder="Enter 10-digit mobile number"
//                   maxLength={10}
//                   disabled={submitting}
//                 />
//               </div>
              
//               <div className="space-y-2">
//                 <Label htmlFor="role">Role *</Label>
//                 <Select 
//                   value={formRoleId.toString()} 
//                   onValueChange={(value) => setFormRoleId(parseInt(value))}
//                   disabled={submitting}
//                 >
//                   <SelectTrigger id="role">
//                     <SelectValue placeholder="Select a role" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {rolesLoading ? (
//                       <SelectItem value="loading" disabled>Loading roles...</SelectItem>
//                     ) : (
//                       roles.map((role) => (
//                         <SelectItem key={role.id} value={role.id.toString()}>
//                           {role.name}
//                         </SelectItem>
//                       ))
//                     )}
//                   </SelectContent>
//                 </Select>
//               </div>

//               {!editingUser && (
//                 <div className="space-y-2">
//                   <Label htmlFor="password">Password *</Label>
//                   <Input 
//                     id="password"
//                     type="password"
//                     value={formPassword} 
//                     onChange={(e) => setFormPassword(e.target.value)} 
//                     placeholder="Enter password (min. 6 characters)"
//                     disabled={submitting}
//                   />
//                   <p className="text-xs text-muted-foreground">
//                     Password must be at least 6 characters long
//                   </p>
//                 </div>
//               )}

//               {editingUser && (
//                 <div className="space-y-2">
//                   <Label htmlFor="status">Status</Label>
//                   <Select 
//                     value={formStatus} 
//                     onValueChange={(value: "active" | "inactive") => setFormStatus(value)}
//                     disabled={submitting}
//                   >
//                     <SelectTrigger id="status">
//                       <SelectValue placeholder="Select status" />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="active">Active</SelectItem>
//                       <SelectItem value="inactive">Inactive</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//               )}

//               <div className="flex justify-end gap-3 pt-2">
//                 <Button 
//                   variant="outline" 
//                   onClick={() => setIsDialogOpen(false)}
//                   disabled={submitting}
//                 >
//                   Cancel
//                 </Button>
//                 <Button 
//                   onClick={handleSave} 
//                   className="bg-primary text-primary-foreground"
//                   disabled={
//                     submitting || 
//                     !formName.trim() || 
//                     !formEmail.trim() || 
//                     !formRoleId ||
//                     (!editingUser && (!formPassword || formPassword.length < 6))
//                   }
//                 >
//                   {submitting ? (
//                     <>
//                       <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
//                       {editingUser ? "Updating..." : "Creating..."}
//                     </>
//                   ) : (
//                     editingUser ? "Update User" : "Create User"
//                   )}
//                 </Button>
//               </div>
//             </div>
//           </DialogContent>
//         </Dialog>

//         {/* Delete Confirmation Dialog */}
//         <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
//           <DialogContent className="max-w-md">
//             <DialogHeader>
//               <DialogTitle className="font-display text-xl text-red-600">
//                 Delete User
//               </DialogTitle>
//               <DialogDescription>
//                 Are you sure you want to delete this user? This action cannot be undone.
//               </DialogDescription>
//             </DialogHeader>
//             <div className="mt-4">
//               {userToDelete && (
//                 <div className="bg-muted/50 p-4 rounded-lg mb-4">
//                   <p className="font-medium">{userToDelete.name}</p>
//                   <p className="text-sm text-muted-foreground">{userToDelete.email}</p>
//                   <p className="text-sm text-muted-foreground">Role: {userToDelete.role}</p>
//                 </div>
//               )}
//               <div className="flex justify-end gap-3">
//                 <Button 
//                   variant="outline" 
//                   onClick={() => setIsDeleteDialogOpen(false)}
//                 >
//                   Cancel
//                 </Button>
//                 <Button 
//                   variant="destructive" 
//                   onClick={handleDelete}
//                 >
//                   Delete User
//                 </Button>
//               </div>
//             </div>
//           </DialogContent>
//         </Dialog>
//       </div>
//     </DashboardLayout>
//   );
// };

// export default UsersPage;


import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Plus, Edit2, RefreshCw, Trash2, Download, MoreVertical, Power, Key, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axios from 'axios';

import { API_BASE_URL } from "../../services/config";


// User type based on backend response
interface User {
  id: number;
  name: string;
  email: string;
  mobile: string;
  role: string;
  roleId: number;
  avatar: string;
  isActive: boolean;
  status: string;
  createdAt: string | null;
  lastLogin: string | null;
}

// Role type for dropdown
interface Role {
  id: number;
  name: string;
  description?: string;
}

// API Response types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  total?: number;
  page?: number;
  totalPages?: number;
}

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formMobile, setFormMobile] = useState("");
  const [formRoleId, setFormRoleId] = useState<number>(4);
  const [formPassword, setFormPassword] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");
  const [submitting, setSubmitting] = useState(false);

  const { toast } = useToast();

  // Get auth token
  const getToken = () => {
    return localStorage.getItem('token');
  };

  // Create axios instance with auth header
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    }
  });

  // Fetch users from backend
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get<ApiResponse<User[]>>('/auth/users');
      
      if (response.data.success) {
        setUsers(response.data.data || []);
      } else {
        toast({
          title: "Error",
          description: response.data.error || "Failed to fetch users",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to connect to the server",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch roles from backend
  const fetchRoles = async () => {
    try {
      setRolesLoading(true);
      const response = await api.get<ApiResponse<Role[]>>('/roles');
      console.log('Roles response:', response);
      
      if (response?.data?.data) {
        setRoles(response?.data?.data || []);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      setRolesLoading(false);
    }
  };

  // Filter users based on search, role, and status
  useEffect(() => {
    const filtered = users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        (u.mobile && u.mobile.includes(search));
      
      const matchRole = roleFilter === "all" || u.roleId.toString() === roleFilter;
      const matchStatus = statusFilter === "all" || u.status === statusFilter;
      
      return matchSearch && matchRole && matchStatus;
    });
    setFilteredUsers(filtered);
  }, [search, roleFilter, statusFilter, users]);

  // Initial fetch
  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === filteredUsers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers.map((u) => u.id));
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setFormName("");
    setFormEmail("");
    setFormMobile("");
    setFormRoleId(4);
    setFormPassword("");
    setFormStatus("active");
    setIsDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormMobile(user.mobile || "");
    setFormRoleId(user.roleId);
    setFormStatus(user.status as "active" | "inactive");
    setFormPassword("");
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    // Validation
    if (!formName.trim()) {
      toast({
        title: "Validation Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required",
        variant: "destructive",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formEmail)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (!formRoleId) {
      toast({
        title: "Validation Error",
        description: "Role is required",
        variant: "destructive",
      });
      return;
    }

    if (!editingUser && (!formPassword || formPassword.length < 6)) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      if (editingUser) {
        // Update existing user
        const response = await api.put<ApiResponse<User>>(`/users/${editingUser.id}`, {
          name: formName,
          email: formEmail,
          mobile: formMobile || null,
          roleId: formRoleId,
          isActive: formStatus === 'active'
        });

        if (response.data.success) {
          // Update local state
          setUsers((prev) =>
            prev.map((u) =>
              u.id === editingUser.id ? { 
                ...u, 
                name: formName, 
                email: formEmail, 
                mobile: formMobile, 
                roleId: formRoleId,
                role: roles.find(r => r.id === formRoleId)?.name || u.role,
                status: formStatus,
                isActive: formStatus === 'active'
              } : u
            )
          );
          
          toast({ 
            title: "Success", 
            description: response.data.message || "User updated successfully" 
          });
          setIsDialogOpen(false);
        } else {
          throw new Error(response.data.error || 'Update failed');
        }
      } else {
        // Create new user
        const response = await api.post<ApiResponse<User>>('/users', {
          name: formName,
          email: formEmail,
          mobile: formMobile || null,
          roleId: formRoleId,
          password: formPassword
        });

        if (response.data.success) {
          await fetchUsers(); // Refresh the list
          toast({ 
            title: "Success", 
            description: response.data.message || "User created successfully" 
          });
          setIsDialogOpen(false);
        } else {
          throw new Error(response.data.error || 'Creation failed');
        }
      }
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to save user",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      const response = await api.delete<ApiResponse<null>>(`/users/${userToDelete.id}`);

      if (response.data.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
        setSelectedIds((prev) => prev.filter(id => id !== userToDelete.id));
        
        toast({ 
          title: "Success", 
          description: response.data.message || "User deleted successfully" 
        });
        setIsDeleteDialogOpen(false);
        setUserToDelete(null);
      } else {
        throw new Error(response.data.error || 'Delete failed');
      }
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      // Delete users one by one
      for (const id of selectedIds) {
        await api.delete(`/users/${id}`);
      }

      setUsers((prev) => prev.filter((u) => !selectedIds.includes(u.id)));
      setSelectedIds([]);
      
      toast({ 
        title: "Success", 
        description: `${selectedIds.length} users deleted successfully` 
      });
    } catch (error: any) {
      console.error('Error bulk deleting users:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to delete users",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (user: User) => {
    try {
      const response = await api.post<ApiResponse<{ newPassword?: string }>>(`/users/${user.id}/reset-password`);

      if (response.data.success) {
        toast({ 
          title: "Success", 
          description: response.data.message || `Password reset successful` 
        });
        
        // In development, show the new password
        if (process.env.NODE_ENV === 'development' && response.data.data?.newPassword) {
          toast({
            title: "Development Mode",
            description: `New password: ${response.data.data.newPassword}`,
          });
        }
      } else {
        throw new Error(response.data.error || 'Reset failed');
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to reset password",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (user: User, newStatus: 'active' | 'inactive') => {
    try {
      const response = await api.patch<ApiResponse<null>>(`/users/${user.id}/status`, {
        status: newStatus
      });

      if (response.data.success) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id ? { 
              ...u, 
              status: newStatus,
              isActive: newStatus === 'active'
            } : u
          )
        );
        
        toast({ 
          title: "Success", 
          description: response.data.message || `User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully` 
        });
      } else {
        throw new Error(response.data.error || 'Status update failed');
      }
    } catch (error: any) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const exportCSV = () => {
    try {
      const headers = ['Name', 'Email', 'Mobile', 'Role', 'Status', 'Last Login', 'Created At'];
      const csvContent = [
        headers.join(','),
        ...filteredUsers.map(user => [
          `"${user.name}"`,
          `"${user.email}"`,
          `"${user.mobile || ''}"`,
          `"${user.role}"`,
          user.status,
          user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never',
          user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({ 
        title: "Success", 
        description: "Users exported successfully" 
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export users",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadgeColor = (roleName: string = '') => {
    switch (roleName?.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'supervisor':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <DashboardLayout title="Users Management" subtitle="Manage users and assign roles">
      <div className="space-y-5">
        {/* Top actions */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchUsers} 
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {selectedIds.length > 0 && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleBulkDelete}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected ({selectedIds.length})
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={openCreate} className="bg-primary text-primary-foreground gap-2">
              <Plus className="h-4 w-4" /> Add User
            </Button>
            <Button variant="outline" onClick={exportCSV} className="gap-2">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or mobile..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {rolesLoading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : (
                  roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="text-sm text-primary">
          Showing {filteredUsers.length} of {users.length} users
        </p>

        {/* Users Table */}
        <Card className="shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="py-3.5 px-4 w-10">
                    <Checkbox
                      checked={selectedIds.length === filteredUsers.length && filteredUsers.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </th>
                  <th className="text-left py-3.5 px-4 text-sm font-semibold text-muted-foreground">User</th>
                  <th className="text-left py-3.5 px-4 text-sm font-semibold text-muted-foreground">Email</th>
                  <th className="text-left py-3.5 px-4 text-sm font-semibold text-muted-foreground">Mobile</th>
                  <th className="text-left py-3.5 px-4 text-sm font-semibold text-muted-foreground">Role</th>
                  <th className="text-left py-3.5 px-4 text-sm font-semibold text-muted-foreground">Status</th>
                  <th className="text-left py-3.5 px-4 text-sm font-semibold text-muted-foreground">Last Login</th>
                  <th className="text-right py-3.5 px-4 text-sm font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-b border-border/50">
                      <td className="py-3.5 px-4"><Skeleton className="h-4 w-4" /></td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <Skeleton className="h-5 w-32" />
                        </div>
                      </td>
                      <td className="py-3.5 px-4"><Skeleton className="h-5 w-40" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-5 w-28" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-5 w-20" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-5 w-16" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-5 w-24" /></td>
                      <td className="py-3.5 px-4"><Skeleton className="h-8 w-24 ml-auto" /></td>
                    </tr>
                  ))
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <Checkbox
                          checked={selectedIds.includes(user.id)}
                          onCheckedChange={() => toggleSelect(user.id)}
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                            {user.avatar || getInitials(user.name)}
                          </div>
                          <span className="text-sm font-medium text-foreground">{user.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-primary">{user.email}</td>
                      <td className="py-3.5 px-4 text-sm text-foreground">{user.mobile || 'N/A'}</td>
                      <td className="py-3.5 px-4">
                        <Badge className={`text-xs font-medium ${getRoleBadgeColor(user.role.name)}`}>
                          {user.role.name}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge 
                          variant={user.status === 'active' ? 'default' : 'destructive'} 
                          className={`text-xs ${user.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}`}
                        >
                          {user.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-muted-foreground">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            onClick={() => openEdit(user)} 
                            title="Edit User"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                <Key className="mr-2 h-4 w-4" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleUpdateStatus(
                                  user, 
                                  user.status === 'active' ? 'inactive' : 'active'
                                )}
                              >
                                <Power className="mr-2 h-4 w-4" />
                                {user.status === 'active' ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(user)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {!loading && filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Add/Edit User Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                {editingUser ? "Edit User" : "Add New User"}
              </DialogTitle>
              <DialogDescription>
                {editingUser 
                  ? "Update user information and role" 
                  : "Create a new user account with specific role"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input 
                  id="name"
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)} 
                  placeholder="Enter full name"
                  disabled={submitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input 
                  id="email"
                  value={formEmail} 
                  onChange={(e) => setFormEmail(e.target.value)} 
                  placeholder="Enter email"
                  type="email"
                  disabled={submitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input 
                  id="mobile"
                  value={formMobile} 
                  onChange={(e) => setFormMobile(e.target.value)} 
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                  disabled={submitting}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select 
                  value={formRoleId.toString()} 
                  onValueChange={(value) => setFormRoleId(parseInt(value))}
                  disabled={submitting || rolesLoading}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {rolesLoading ? (
                      <SelectItem value="loading" disabled>Loading roles...</SelectItem>
                    ) : (
                      roles.map((role) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {!editingUser && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input 
                    id="password"
                    type="password"
                    value={formPassword} 
                    onChange={(e) => setFormPassword(e.target.value)} 
                    placeholder="Enter password (min. 6 characters)"
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 6 characters long
                  </p>
                </div>
              )}

              {editingUser && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formStatus} 
                    onValueChange={(value: "active" | "inactive") => setFormStatus(value)}
                    disabled={submitting}
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  className="bg-primary text-primary-foreground"
                  disabled={
                    submitting || 
                    !formName.trim() || 
                    !formEmail.trim() || 
                    !formRoleId ||
                    (!editingUser && (!formPassword || formPassword.length < 6))
                  }
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingUser ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    editingUser ? "Update User" : "Create User"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-red-600">
                Delete User
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this user? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {userToDelete && (
                <div className="bg-muted/50 p-4 rounded-lg mb-4">
                  <p className="font-medium">{userToDelete.name}</p>
                  <p className="text-sm text-muted-foreground">{userToDelete.email}</p>
                  <p className="text-sm text-muted-foreground">Role: {userToDelete.role}</p>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDelete}
                >
                  Delete User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default UsersPage;