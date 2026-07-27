import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ArrowRight, Check, User, BookOpen, Briefcase, GraduationCap, School, MapPin, Users, Building2, KeyRound, ShieldCheck } from "lucide-react";
import { rwandaProvinces, rwandaDistricts, educationLevels, subjects, type Province } from "@/data/rwandaLocations";
import { getSchoolsByLocation } from "@/data/rwandaSchools";
import { cn } from "@/lib/utils";

type Role = "student" | "teacher" | "mentor" | "school_admin";

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
  
  // Mentor / School admin specific
  organizationName: string;
  roleDescription: string;

  // School portal access
  schoolCode: string;
  joinMode: "school" | "independent";
  verifiedSchoolName: string;
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
  schoolCode: "",
  joinMode: "school",
  verifiedSchoolName: "",
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
        if (formData.role === "teacher") {
          // Teachers may only join through their school portal
          return (
            formData.verifiedSchoolName !== "" &&
            formData.educationLevelTaught !== ""
          );
        }
        if (formData.role === "student") {
          if (formData.joinMode === "school") {
            return formData.verifiedSchoolName !== "" && formData.educationLevel !== "";
          }
          return (
            formData.province !== "" &&
            formData.district !== "" &&
            formData.educationLevel !== ""
          );
        }
        if (formData.role === "mentor") {
          return (
            formData.roleDescription.trim() !== "" &&
            formData.subjectsTaught.length > 0
          );
        }
        if (formData.role === "school_admin") {
          return (
            formData.schoolName.trim() !== "" &&
            formData.province !== "" &&
            formData.district !== ""
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
        metadata.school_name = formData.verifiedSchoolName || formData.schoolName;
        metadata.province = formData.province;
        metadata.district = formData.district;
        metadata.education_level = formData.educationLevel;
        metadata.join_mode = formData.role === "teacher" ? "school" : formData.joinMode;
        if (formData.schoolCode.trim() !== "") {
          metadata.school_code = formData.schoolCode.trim().toUpperCase();
        }
      }

      if (formData.role === "student" && formData.combinationDepartment) {
        metadata.combination_department = formData.combinationDepartment;
      }

      if (formData.role === "teacher") {
        metadata.subjects_taught = JSON.stringify(formData.subjectsTaught);
        metadata.education_level_taught = formData.educationLevelTaught;
      }

      if (formData.role === "mentor") {
        metadata.subjects_taught = JSON.stringify(formData.subjectsTaught);
        metadata.organization_name = formData.organizationName;
        metadata.role_description = formData.roleDescription;
      }

      if (formData.role === "school_admin") {
        metadata.school_name = formData.schoolName;
        metadata.province = formData.province;
        metadata.district = formData.district;
        metadata.organization_name = formData.schoolName;
        metadata.role_description = "School Administrator";
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
      description: "Join with your school code, or learn independently with a mentor",
      icon: GraduationCap,
    },
    {
      id: "teacher" as Role,
      title: "Teacher",
      description: "Enter through your school portal using the school access code",
      icon: BookOpen,
    },
    {
      id: "mentor" as Role,
      title: "Mentor",
      description: "Teach independently — no school required. Students enroll with you",
      icon: Users,
    },
    {
      id: "school_admin" as Role,
      title: "School Admin",
      description: "Register your school and manage its teachers and students",
      icon: Building2,
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
  if (formData.role === "mentor") {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold">Mentor Profile</h3>
          <p className="text-sm text-muted-foreground">
            Mentors work independently — no school portal needed
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Areas of Expertise</Label>
            <div className="flex flex-wrap gap-2 p-3 border rounded-lg max-h-40 overflow-y-auto">
              {subjects.map((subject) => (
                <button
                  key={subject}
                  type="button"
                  onClick={() => onSubjectToggle(subject)}
                  className={cn(
                    "px-3 py-1 text-sm rounded-full transition-all min-h-[36px]",
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
            <Label htmlFor="organizationName">Organization (Optional)</Label>
            <Input
              id="organizationName"
              placeholder="Independent, tutoring centre, NGO..."
              value={formData.organizationName}
              onChange={(e) => updateFormData("organizationName", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="roleDescription">Short Bio</Label>
            <Textarea
              id="roleDescription"
              placeholder="Tell students what you mentor in and your experience"
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

  if (formData.role === "school_admin") {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold">Your School</h3>
          <p className="text-sm text-muted-foreground">
            We'll create your school portal and generate an access code after sign in
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="schoolName">School Name</Label>
          <Input
            id="schoolName"
            placeholder="e.g., Groupe Scolaire Musanze"
            value={formData.schoolName}
            onChange={(e) => updateFormData("schoolName", e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Province</Label>
            <Select
              value={formData.province}
              onValueChange={(value) => {
                updateFormData("province", value);
                updateFormData("district", "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                {rwandaProvinces.map((province) => (
                  <SelectItem key={province} value={province}>{province}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>District</Label>
            <Select
              value={formData.district}
              onValueChange={(value) => updateFormData("district", value)}
              disabled={!formData.province}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent>
                {availableDistricts.map((district) => (
                  <SelectItem key={district} value={district}>{district}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      <SchoolAccessSection formData={formData} updateFormData={updateFormData} />


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
        <Label htmlFor="schoolName">School Name</Label>
        <Input
          id="schoolName"
          placeholder="Enter your school name"
          value={formData.schoolName}
          onChange={(e) => updateFormData("schoolName", e.target.value)}
          required
        />
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

        {/* Mentor / School admin info */}
        {(formData.role === "mentor" || formData.role === "school_admin") && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {formData.role === "mentor" ? "Mentor Profile" : "School"}
              </span>
            </div>
            <div className="text-sm space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">
                  {formData.role === "mentor" ? "Organization" : "School Name"}
                </p>
                <p className="font-medium">
                  {formData.role === "mentor"
                    ? formData.organizationName || "Independent"
                    : formData.schoolName}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  {formData.role === "mentor" ? "Bio" : "Location"}
                </p>
                <p className="font-medium">
                  {formData.role === "mentor"
                    ? formData.roleDescription
                    : `${formData.district}, ${formData.province}`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// School portal access: teachers must enter via a school code, students may choose
const SchoolAccessSection = ({
  formData,
  updateFormData,
}: {
  formData: SignUpFormData;
  updateFormData: (field: keyof SignUpFormData, value: any) => void;
}) => {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isTeacher = formData.role === "teacher";

  const verifyCode = async () => {
    const code = formData.schoolCode.trim().toUpperCase();
    if (code.length < 4) {
      setError("Enter the access code given by your school");
      return;
    }
    setChecking(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("lookup_school_by_code", { _code: code });
    setChecking(false);

    if (rpcError || !data || data.length === 0) {
      updateFormData("verifiedSchoolName", "");
      setError("No school found with this code. Please check with your school administrator.");
      return;
    }

    const school = data[0];
    updateFormData("verifiedSchoolName", school.name);
    updateFormData("schoolName", school.name);
    if (school.province) updateFormData("province", school.province);
    if (school.district) updateFormData("district", school.district);
  };

  return (
    <div className="space-y-4 mb-4">
      {!isTeacher && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateFormData("joinMode", "school")}
            className={cn(
              "p-3 rounded-lg border-2 text-left min-h-[44px] transition-all",
              formData.joinMode === "school" ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <p className="font-medium text-sm">Join my school</p>
            <p className="text-xs text-muted-foreground">I have a school access code</p>
          </button>
          <button
            type="button"
            onClick={() => {
              updateFormData("joinMode", "independent");
              updateFormData("schoolCode", "");
              updateFormData("verifiedSchoolName", "");
            }}
            className={cn(
              "p-3 rounded-lg border-2 text-left min-h-[44px] transition-all",
              formData.joinMode === "independent" ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <p className="font-medium text-sm">Learn independently</p>
            <p className="text-xs text-muted-foreground">Request enrollment with a mentor later</p>
          </button>
        </div>
      )}

      {(isTeacher || formData.joinMode === "school") && (
        <div className="space-y-2 p-3 rounded-lg border bg-muted/30">
          <Label htmlFor="schoolCode" className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            School Access Code {isTeacher && <span className="text-destructive">*</span>}
          </Label>
          <div className="flex gap-2">
            <Input
              id="schoolCode"
              placeholder="e.g., ILC-4K7Q2"
              value={formData.schoolCode}
              onChange={(e) => {
                updateFormData("schoolCode", e.target.value.toUpperCase());
                updateFormData("verifiedSchoolName", "");
                setError(null);
              }}
              className="uppercase"
            />
            <Button type="button" variant="outline" onClick={verifyCode} disabled={checking}>
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
            </Button>
          </div>
          {formData.verifiedSchoolName && (
            <p className="text-sm text-primary flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              {formData.verifiedSchoolName}
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {isTeacher && !formData.verifiedSchoolName && (
            <p className="text-xs text-muted-foreground">
              Teachers must join through their school portal. Ask your school administrator for the
              code, or sign up as a Mentor to teach independently.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
