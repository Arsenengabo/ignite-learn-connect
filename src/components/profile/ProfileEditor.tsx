import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Save } from "lucide-react";
import { rwandaProvinces, rwandaDistricts, educationLevels, subjects, type Province } from "@/data/rwandaLocations";
import { getSchoolsByLocation } from "@/data/rwandaSchools";
import { cn } from "@/lib/utils";

interface ProfileEditorProps {
  userProfile: any;
  userRole: string | null;
  onProfileUpdate: () => void;
  trigger?: React.ReactNode;
}

export const ProfileEditor = ({ userProfile, userRole, onProfileUpdate, trigger }: ProfileEditorProps) => {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    fullName: "",
    bio: "",
    province: "",
    district: "",
    schoolName: "",
    educationLevel: "",
    combinationDepartment: "",
    subjectsTaught: [] as string[],
    educationLevelTaught: "",
    organizationName: "",
    roleDescription: "",
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        fullName: userProfile.full_name || "",
        bio: userProfile.bio || "",
        province: userProfile.province || "",
        district: userProfile.district || "",
        schoolName: userProfile.school_name || "",
        educationLevel: userProfile.education_level || "",
        combinationDepartment: userProfile.combination_department || "",
        subjectsTaught: userProfile.subjects_taught || [],
        educationLevelTaught: userProfile.education_level_taught || "",
        organizationName: userProfile.organization_name || "",
        roleDescription: userProfile.role_description || "",
      });
    }
  }, [userProfile]);

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const availableDistricts = formData.province 
    ? rwandaDistricts[formData.province as Province] || [] 
    : [];

  const availableSchools = getSchoolsByLocation(formData.province, formData.district);

  const handleSubjectToggle = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjectsTaught: prev.subjectsTaught.includes(subject)
        ? prev.subjectsTaught.filter(s => s !== subject)
        : [...prev.subjectsTaught, subject]
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updates: Record<string, any> = {
        full_name: formData.fullName,
        bio: formData.bio,
        updated_at: new Date().toISOString(),
      };

      if (userRole === "student" || userRole === "teacher") {
        updates.province = formData.province;
        updates.district = formData.district;
        updates.school_name = formData.schoolName;
        updates.education_level = formData.educationLevel;
      }

      if (userRole === "student") {
        updates.combination_department = formData.combinationDepartment;
      }

      if (userRole === "teacher") {
        updates.subjects_taught = formData.subjectsTaught;
        updates.education_level_taught = formData.educationLevelTaught;
      }

      if (userRole === "other") {
        updates.organization_name = formData.organizationName;
        updates.role_description = formData.roleDescription;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userProfile.user_id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      
      onProfileUpdate();
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <User className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={formData.fullName}
                onChange={(e) => updateFormData("fullName", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself..."
                value={formData.bio}
                onChange={(e) => updateFormData("bio", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Student/Teacher specific fields */}
          {(userRole === "student" || userRole === "teacher") && (
            <>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">School Information</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="province">Province</Label>
                    <Select
                      value={formData.province}
                      onValueChange={(value) => {
                        updateFormData("province", value);
                        updateFormData("district", "");
                        updateFormData("schoolName", "");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select province" />
                      </SelectTrigger>
                      <SelectContent>
                        {rwandaProvinces.map((province) => (
                          <SelectItem key={province} value={province}>
                            {province}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="district">District</Label>
                    <Select
                      value={formData.district}
                      onValueChange={(value) => {
                        updateFormData("district", value);
                        updateFormData("schoolName", "");
                      }}
                      disabled={!formData.province}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDistricts.map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="schoolName">School</Label>
                  <Select
                    value={formData.schoolName}
                    onValueChange={(value) => updateFormData("schoolName", value)}
                    disabled={!formData.district}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your school" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSchools.map((school) => (
                        <SelectItem key={school.name} value={school.name}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 mt-4">
                  <Label htmlFor="educationLevel">Education Level</Label>
                  <Select
                    value={formData.educationLevel}
                    onValueChange={(value) => updateFormData("educationLevel", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select education level" />
                    </SelectTrigger>
                    <SelectContent>
                      {educationLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {userRole === "student" && (
                <div className="space-y-2">
                  <Label htmlFor="combinationDepartment">Combination/Department</Label>
                  <Input
                    id="combinationDepartment"
                    placeholder="e.g., MCB, PCM, HEG, Computer Science"
                    value={formData.combinationDepartment}
                    onChange={(e) => updateFormData("combinationDepartment", e.target.value)}
                  />
                </div>
              )}

              {userRole === "teacher" && (
                <>
                  <div className="space-y-2">
                    <Label>Subjects Taught</Label>
                    <div className="flex flex-wrap gap-2 p-3 border rounded-lg max-h-40 overflow-y-auto">
                      {subjects.map((subject) => (
                        <button
                          key={subject}
                          type="button"
                          onClick={() => handleSubjectToggle(subject)}
                          className={cn(
                            "px-3 py-1 text-sm rounded-full transition-all",
                            formData.subjectsTaught.includes(subject)
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-accent"
                          )}
                        >
                          {subject}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="educationLevelTaught">Education Level Taught</Label>
                    <Select
                      value={formData.educationLevelTaught}
                      onValueChange={(value) => updateFormData("educationLevelTaught", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select level you teach" />
                      </SelectTrigger>
                      <SelectContent>
                        {educationLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </>
          )}

          {/* Other role specific fields */}
          {userRole === "other" && (
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Organization Information</h4>
              
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  value={formData.organizationName}
                  onChange={(e) => updateFormData("organizationName", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="roleDescription">Role Description</Label>
                <Textarea
                  id="roleDescription"
                  value={formData.roleDescription}
                  onChange={(e) => updateFormData("roleDescription", e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
