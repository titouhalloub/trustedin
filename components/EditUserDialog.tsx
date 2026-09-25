"use client"

import { useState, useEffect } from "react"
import { useSupabaseClient } from "@supabase/auth-helpers-react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface UserProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  role: string | null;
}

interface EditUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUserUpdate: () => void;
}

export const EditUserDialog = ({ isOpen, onClose, user, onUserUpdate }: EditUserDialogProps) => {
  const { toast } = useToast();
  const supabase = useSupabaseClient();
  const [formData, setFormData] = useState({
    full_name: "",
    username: "",
    role: "user",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        username: user.username || "",
        role: user.role || "user",
      });
    }
  }, [user]);

  if (!user) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleRoleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, role: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name,
        username: formData.username,
        role: formData.role,
      })
      .eq("id", user.id);

    setIsSaving(false);

    if (error) {
      if (error.code === '23505') {
        toast({
          variant: "destructive",
          title: "Username Taken",
          description: "This username is already in use. Please choose another one.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error updating user",
          description: error.message,
        });
      }
    } else {
      toast({
        title: "User updated successfully",
        description: `${formData.full_name}'s profile has been updated.`,
      });
      onUserUpdate();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Make changes to the user's profile here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="full_name" className="text-right">Full Name</Label><Input id="full_name" value={formData.full_name} onChange={handleInputChange} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="username" className="text-right">Username</Label><Input id="username" value={formData.username} onChange={handleInputChange} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">Role</Label>
              <Select value={formData.role} onValueChange={handleRoleChange}>
                <SelectTrigger className="col-span-3"><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};