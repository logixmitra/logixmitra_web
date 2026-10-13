import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Shield, Plus, Edit2, Trash2, RefreshCw, Search, 
  ChevronLeft, ChevronRight, Loader2, AlertCircle 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const RolesPage = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRoles, setTotalRoles] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, user } = useAuth();

  useEffect(() => {
    const token = localStorage.getItem('token');



    console.log(token,user, 'isAuthenticated:', isAuthenticated, 'isAdmin:', isAdmin,user);
    if (!token || !isAuthenticated) {
      setAuthError(true);
      sonnerToast.error("Please login to access this page");
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    if (user.role != 'admin') {

      sonnerToast.error("You don't have permission to access this page");
      setTimeout(() => navigate('/dashboard'), 2000);
      return;
    }

    fetchRoles();
  }, [currentPage, searchTerm, isAuthenticated, isAdmin, navigate]);

  const fetchRoles = async () => {
    setLoading(true);
    setAuthError(false);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('Fetching roles...');
      
      const response = await api.getRoles({
        page: currentPage,
        limit: 10,
        search: searchTerm
      });

     console.log('Fetch roles response:', response);
      
      if (response.data) {
        setRoles(response.data || []);
        setTotalPages(response.totalPages || 1);
        setTotalRoles(response.total || 0);
      } else {
        throw new Error(response.message || 'Failed to fetch roles');
      }
    } catch (error) {
      console.error('Fetch roles error:', error);
      
      if (error.status === 401 || error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        setAuthError(true);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sonnerToast.error("Session expired. Please login again.");
        setTimeout(() => navigate('/login'), 2000);
      } else {
        sonnerToast.error("Failed to fetch roles: " + error.message);
        setRoles([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setCurrentPage(1);
  };

  const openCreate = () => {
    setEditingRole(null);
    setFormName("");
    setFormDesc("");
    setIsDialogOpen(true);
  };

  const openEdit = (role) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDesc(role.description || "");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      sonnerToast.error("Role name is required");
      return;
    }

    setFormSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      if (editingRole) {
        const response = await api.updateRole(editingRole.id, {
          name: formName,
          description: formDesc
        });
        toast({ 
          title: "Success", 
          description: response.message || "Role updated successfully"
        });
      } else {
        const response = await api.createRole({
          name: formName,
          description: formDesc
        });
        toast({ 
          title: "Success", 
          description: response.message || "Role created successfully"
        });
      }
      setIsDialogOpen(false);
      fetchRoles();
    } catch (error) {
      console.error('Save role error:', error);
      
      if (error.status === 401) {
        setAuthError(true);
        localStorage.removeItem('token');
        sonnerToast.error("Session expired. Please login again.");
        setTimeout(() => navigate('/login'), 2000);
      } else {
        sonnerToast.error(error.message || "Failed to save role");
      }
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the role "${name}"?`)) {
      return;
    }

    try {
      const response = await api.deleteRole(id);
      toast({ 
        title: "Success", 
        description: response.message || "Role deleted successfully"
      });
      fetchRoles();
    } catch (error) {
      console.error('Delete role error:', error);
      
      if (error.status === 401) {
        setAuthError(true);
        localStorage.removeItem('token');
        sonnerToast.error("Session expired. Please login again.");
        setTimeout(() => navigate('/login'), 2000);
      } else {
        sonnerToast.error(error.message || "Failed to delete role");
      }
    }
  };

  const handleReset = async (id) => {
    if (!window.confirm("Are you sure you want to reset this system role to default?")) {
      return;
    }

    try {
      const response = await api.resetRole(id);
      toast({ 
        title: "Success", 
        description: response.message || "Role reset successfully"
      });
      fetchRoles();
    } catch (error) {
      console.error('Reset role error:', error);
      
      if (error.status === 401) {
        setAuthError(true);
        localStorage.removeItem('token');
        sonnerToast.error("Session expired. Please login again.");
        setTimeout(() => navigate('/login'), 2000);
      } else {
        sonnerToast.error(error.message || "Failed to reset role");
      }
    }
  };

  const handleRefresh = () => {
    fetchRoles();
  };

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  const totalPerms = (role) => {
    return role.modulePermissions?.reduce((sum, mp) => sum + mp.actions.length, 0) || 0;
  };

  if (authError) {
    return (
      <DashboardLayout title="Roles Management" subtitle="Create and manage user roles">
        <Card className="p-12 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Authentication Required</h3>
          <p className="text-gray-600 mb-6">Your session has expired. Please login again to access this page.</p>
          <Button onClick={handleLoginRedirect} className="bg-primary hover:bg-primary/90">
            Go to Login
          </Button>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Roles Management" subtitle="Create and manage user roles">
      <div className="space-y-6">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search roles..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>

          <div className="flex gap-2">
            {/* Refresh Button */}
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            {/* Add Button */}
            <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 gap-2">
              <Plus className="h-4 w-4" /> Add Role
            </Button>
          </div>
        </div>

        {/* Roles Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3.5 px-5 text-sm font-semibold text-gray-600">Name</th>
                      <th className="text-left py-3.5 px-5 text-sm font-semibold text-gray-600">Description</th>
                      <th className="text-left py-3.5 px-5 text-sm font-semibold text-gray-600">Permissions</th>
                      <th className="text-left py-3.5 px-5 text-sm font-semibold text-gray-600">Users</th>
                      <th className="text-right py-3.5 px-5 text-sm font-semibold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roles.map((role) => (
                      <tr key={role.id} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <span className="font-medium">{role.name}</span>
                            {role.isSystem && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                System
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-5 text-gray-600">{role.description || '-'}</td>
                        <td className="py-4 px-5">
                          <span className="text-sm bg-gray-100 px-3 py-1 rounded-full">
                            {totalPerms(role)} permissions
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <span className="text-sm bg-gray-100 px-3 py-1 rounded-full">
                            {role.usersCount || 0} users
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          <div className="flex items-center justify-end gap-2">
                            {role.isSystem && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => handleReset(role.id)}
                                title="Reset to default"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9"
                              onClick={() => openEdit(role)}
                              title="Edit"
                              disabled={role.isSystem}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                              onClick={() => handleDelete(role.id, role.name)}
                              title="Delete"
                              disabled={role.isSystem}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {roles.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-500">
                          No roles found. Create one to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 border-t">
                  <p className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalRoles)} of {totalRoles} roles
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="flex items-center px-4 py-2 text-sm border rounded-md">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Add/Edit Role Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">
                {editingRole ? "Edit Role" : "Add New Role"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Role Name <span className="text-red-500">*</span></Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Admin"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="e.g. Full system access"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="bg-primary hover:bg-primary/90"
                  disabled={!formName.trim() || formSubmitting}
                >
                  {formSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingRole ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    editingRole ? "Update" : "Create"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default RolesPage;