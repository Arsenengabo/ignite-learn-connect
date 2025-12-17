import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ArrowRight, Check, User, BookOpen, Briefcase, GraduationCap, School, MapPin } from "lucide-react";
import { rwandaProvinces, rwandaDistricts, educationLevels, subjects, type Province } from "@/data/rwandaLocations";
import { getSchoolsByLocation } from "@/data/rwandaSchools";
import { cn } from "@/lib/utils";

type Role = "student" | "teacher" | "other";

interface SignUpFormData {
  // Step 1 - Role
  role: Role | null;
  
  // Step 2 - Account
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  
  // Step 3 - Role specific
  // Student & Teacher
  province: string;
  district: string;
  schoolName: string;
  educationLevel: string;
  
  // Student specific
  combinationDepartment: string;
  
  // Teacher specific
  subjectsTaught: string[];
  educationLevelTaught: string;
  
  // Other specific
  organizationName: string;
  roleDescription: string;
}

const initialFormData: SignUpFormData = {
  role: null,
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  province: "",
  district: "",
  schoolName: "",
  educationLevel: "",
  combinationDepartment: "",
  subjectsTaught: [],
  educationLevelTaught: "",
  organizationName: "",
  roleDescription: "",
};

const steps = [
  { id: 1, title: "Role Selection", description: "Choose your role" },
  { id: 2, title: "Account Info", description: "Your credentials" },
  { id: 3, title: "Details", description: "Role-specific info" },
  { id: 4, title: "Review", description: "Confirm details" },
];

export const SignUpWizard = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<SignUpFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const updateFormData = (field: keyof SignUpFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const availableDistricts = formData.province 
    ? rwandaDistricts[formData.province as Province] || [] 
    : [];

  const availableSchools = getSchoolsByLocation(formData.province, formData.district);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.role !== null;
      case 2:
        return (
          formData.fullName.trim() !== "" &&
          formData.email.trim() !== "" &&
          formData.password.length >= 6 &&
          formData.password === formData.confirmPassword
        );
      case 3:
        if (formData.role === "student" || formData.role === "teacher") {
          return (
            formData.province !== "" &&
            formData.district !== "" &&
            formData.schoolName !== "" &&
            formData.educationLevel !== ""
          );
        }
        if (formData.role === "other") {
          return (
            formData.organizationName.trim() !== "" &&
            formData.roleDescription.trim() !== ""
          );
        }
        return false;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4 && canProceed()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;
    
    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const metadata: Record<string, any> = {
        full_name: formData.fullName,
        role: formData.role,
      };

      if (formData.role === "student" || formData.role === "teacher") {
        metadata.school_name = formData.schoolName;
        metadata.province = formData.province;
        metadata.district = formData.district;
        metadata.education_level = formData.educationLevel;
      }

      if (formData.role === "student" && formData.combinationDepartment) {
        metadata.combination_department = formData.combinationDepartment;
      }

      if (formData.role === "teacher") {
        metadata.subjects_taught = JSON.stringify(formData.subjectsTaught);
        metadata.education_level_taught = formData.educationLevelTaught;
      }

      if (formData.role === "other") {
        metadata.organization_name = formData.organizationName;
        metadata.role_description = formData.roleDescription;
      }

      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata
        }
      });

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Welcome to Ignite Learn Connect!",
          description: "Check your email to confirm your account."
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubjectToggle = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjectsTaught: prev.subjectsTaught.includes(subject)
        ? prev.subjectsTaught.filter(s => s !== subject)
        : [...prev.subjectsTaught, subject]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                  currentStep > step.id
                    ? "bg-primary text-primary-foreground"
                    : currentStep === step.id
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
              </div>
              <span className="text-xs mt-2 text-muted-foreground hidden sm:block">
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-12 sm:w-16 h-1 mx-2 rounded transition-all",
                  currentStep > step.id ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="min-h-[300px]">
        {currentStep === 1 && (
          <RoleSelectionStep
            selectedRole={formData.role}
            onSelectRole={(role) => updateFormData("role", role)}
          />
        )}

        {currentStep === 2 && (
          <AccountInfoStep
            formData={formData}
            updateFormData={updateFormData}
          />
        )}

        {currentStep === 3 && (
          <RoleSpecificStep
            formData={formData}
            updateFormData={updateFormData}
            availableDistricts={availableDistricts}
            availableSchools={availableSchools}
            onSubjectToggle={handleSubjectToggle}
          />
        )}

        {currentStep === 4 && (
          <ReviewStep formData={formData} />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {currentStep < 4 ? (
          <Button
            type="button"
            onClick={handleNext}
            disabled={!canProceed()}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !canProceed()}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>
        )}
      </div>
    </div>
  );
};

// Step 1: Role Selection
const RoleSelectionStep = ({
  selectedRole,
  onSelectRole
}: {
  selectedRole: Role | null;
  onSelectRole: (role: Role) => void;
}) => {
  const roles = [
    {
      id: "student" as Role,
      title: "Student",
      description: "I'm here to learn and take courses",
      icon: GraduationCap,
    },
    {
      id: "teacher" as Role,
      title: "Teacher",
      description: "I create and manage courses",
      icon: BookOpen,
    },
    {
      id: "other" as Role,
      title: "Other",
      description: "Parent, administrator, or other role",
      icon: Briefcase,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Select Your Role</h3>
        <p className="text-sm text-muted-foreground">Choose the option that best describes you</p>
      </div>
      
      <div className="grid gap-4">
        {roles.map((role) => (
          <button
            key={role.id}
            type="button"
            onClick={() => onSelectRole(role.id)}
            className={cn(
              "flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left",
              selectedRole === role.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-accent"
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center",
                selectedRole === role.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <role.icon className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-medium">{role.title}</h4>
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </div>
            {selectedRole === role.id && (
              <Check className="w-5 h-5 text-primary ml-auto" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// Step 2: Account Info
const AccountInfoStep = ({
  formData,
  updateFormData
}: {
  formData: SignUpFormData;
  updateFormData: (field: keyof SignUpFormData, value: any) => void;
}) => {
  const passwordsMatch = formData.password === formData.confirmPassword;
  const passwordLengthOk = formData.password.length >= 6;

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Create Your Account</h3>
        <p className="text-sm text-muted-foreground">Enter your account information</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            placeholder="Enter your full name"
            value={formData.fullName}
            onChange={(e) => updateFormData("fullName", e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={(e) => updateFormData("email", e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 6 characters"
            value={formData.password}
            onChange={(e) => updateFormData("password", e.target.value)}
            required
          />
          {formData.password && !passwordLengthOk && (
            <p className="text-xs text-destructive">Password must be at least 6 characters</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChange={(e) => updateFormData("confirmPassword", e.target.value)}
            required
          />
          {formData.confirmPassword && !passwordsMatch && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Step 3: Role-Specific Information
const RoleSpecificStep = ({
  formData,
  updateFormData,
  availableDistricts,
  availableSchools,
  onSubjectToggle
}: {
  formData: SignUpFormData;
  updateFormData: (field: keyof SignUpFormData, value: any) => void;
  availableDistricts: string[];
  availableSchools: { name: string; district: string; province: string }[];
  onSubjectToggle: (subject: string) => void;
}) => {
  if (formData.role === "other") {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold">Tell Us About Yourself</h3>
          <p className="text-sm text-muted-foreground">Share your organization and role</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organizationName">Organization/Institution Name</Label>
            <Input
              id="organizationName"
              placeholder="Enter organization name"
              value={formData.organizationName}
              onChange={(e) => updateFormData("organizationName", e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="roleDescription">Role Description</Label>
            <Textarea
              id="roleDescription"
              placeholder="Describe your role (e.g., Parent, School Administrator, Education Officer)"
              value={formData.roleDescription}
              onChange={(e) => updateFormData("roleDescription", e.target.value)}
              rows={3}
              required
            />
          </div>
        </div>
      </div>
    );
  }

  // Student or Teacher
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">
          {formData.role === "student" ? "Student Information" : "Teacher Information"}
        </h3>
        <p className="text-sm text-muted-foreground">Tell us about your school and education</p>
      </div>

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

      <div className="space-y-2">
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

      <div className="space-y-2">
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

      {formData.role === "student" && (
        <div className="space-y-2">
          <Label htmlFor="combinationDepartment">Combination/Department (Optional)</Label>
          <Input
            id="combinationDepartment"
            placeholder="e.g., MCB, PCM, HEG, Computer Science"
            value={formData.combinationDepartment}
            onChange={(e) => updateFormData("combinationDepartment", e.target.value)}
          />
        </div>
      )}

      {formData.role === "teacher" && (
        <>
          <div className="space-y-2">
            <Label>Subjects Taught</Label>
            <div className="flex flex-wrap gap-2 p-3 border rounded-lg max-h-40 overflow-y-auto">
              {subjects.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  onClick={() => onSubjectToggle(subject)}
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
            {formData.subjectsTaught.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Selected: {formData.subjectsTaught.join(", ")}
              </p>
            )}
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
    </div>
  );
};

// Step 4: Review
const ReviewStep = ({ formData }: { formData: SignUpFormData }) => {
  const getRoleIcon = () => {
    switch (formData.role) {
      case "student":
        return <GraduationCap className="w-6 h-6" />;
      case "teacher":
        return <BookOpen className="w-6 h-6" />;
      default:
        return <Briefcase className="w-6 h-6" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Review Your Information</h3>
        <p className="text-sm text-muted-foreground">Please confirm your details before creating your account</p>
      </div>

      <div className="space-y-4">
        {/* Role */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {getRoleIcon()}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Role</p>
            <p className="font-medium capitalize">{formData.role}</p>
          </div>
        </div>

        {/* Account Info */}
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Account</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-medium">{formData.fullName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{formData.email}</p>
            </div>
          </div>
        </div>

        {/* Location & School (for student/teacher) */}
        {(formData.role === "student" || formData.role === "teacher") && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <School className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">School & Location</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">School</p>
                <p className="font-medium">{formData.schoolName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Education Level</p>
                <p className="font-medium">{formData.educationLevel}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Province</p>
                <p className="font-medium">{formData.province}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">District</p>
                <p className="font-medium">{formData.district}</p>
              </div>
            </div>

            {formData.role === "student" && formData.combinationDepartment && (
              <div className="text-sm">
                <p className="text-xs text-muted-foreground">Combination/Department</p>
                <p className="font-medium">{formData.combinationDepartment}</p>
              </div>
            )}

            {formData.role === "teacher" && (
              <>
                {formData.subjectsTaught.length > 0 && (
                  <div className="text-sm">
                    <p className="text-xs text-muted-foreground">Subjects Taught</p>
                    <p className="font-medium">{formData.subjectsTaught.join(", ")}</p>
                  </div>
                )}
                {formData.educationLevelTaught && (
                  <div className="text-sm">
                    <p className="text-xs text-muted-foreground">Level Taught</p>
                    <p className="font-medium">{formData.educationLevelTaught}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Other role info */}
        {formData.role === "other" && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Organization</span>
            </div>
            <div className="text-sm space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Organization Name</p>
                <p className="font-medium">{formData.organizationName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Role Description</p>
                <p className="font-medium">{formData.roleDescription}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
