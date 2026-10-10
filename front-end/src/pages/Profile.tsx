import { useState, useRef, useEffect } from "react";
import {
  ShieldCheck,
  Store,
  Pencil,
  Check,
  X,
  Loader2,
  Calendar,
  Mail,
  User as UserIcon,
  AlertCircle,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";

import {
  getCurrentUser,
  updateUser,
  getStorageUrl,
  type ManagedUser,
} from "@/context/userService";
import { useToast } from "@/components/ui/Toast";
import { ClayButton } from "@/components/ui/ClayButton";

type EditableField = "avatar" | "name" | "email" | null;

type ValidationErrors = {
  name?: string[];
  email?: string[];
  profile_image?: string[];
};

export default function Profile() {
  const { toast } = useToast();

  const [validationErrors, setValidationErrors] = useState<ValidationErrors>(
    {},
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<ManagedUser | null>(null);
  const [fetchingUser, setFetchingUser] = useState(true);

  const [editingField, setEditingField] = useState<EditableField>(null);

  const [nameValue, setNameValue] = useState("");
  const [emailValue, setEmailValue] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setFetchingUser(true);

    getCurrentUser()
      .then((userData) => {
        if (!isMounted) return;
        setUser(userData);
        setNameValue(userData.name || "");
        setEmailValue(userData.email || "");
        setAvatarPreview(getStorageUrl(userData.image));
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to get user profile:", err);
        setErrorMsg("Failed to load user profile. Please refresh the page.");
      })
      .finally(() => {
        if (isMounted) setFetchingUser(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const currentPhotoUrl = avatarPreview || getStorageUrl(user?.image);

  const handleStartEdit = (field: EditableField) => {
    setErrorMsg(null);
    setValidationErrors({});

    if (field === "name") {
      setNameValue(user?.name || "");
    } else if (field === "email") {
      setEmailValue(user?.email || "");
    } else if (field === "avatar") {
      setAvatarFile(null);
      setAvatarPreview(getStorageUrl(user?.image));

      setTimeout(() => {
        fileInputRef.current?.click();
      }, 50);
    }

    setEditingField(field);
  };

  const handleCancel = () => {
    setErrorMsg(null);
    setValidationErrors({});

    if (editingField === "name") {
      setNameValue(user?.name || "");
    } else if (editingField === "email") {
      setEmailValue(user?.email || "");
    } else if (editingField === "avatar") {
      setAvatarFile(null);
      setAvatarPreview(getStorageUrl(user?.image));
    }

    setEditingField(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) {
      setErrorMsg("Invalid file format.");
      toast({
        title: "Invalid File Format",
        description: "File format must be JPG, JPEG, PNG, or WEBP.",
        variant: "error",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("File size cannot exceed 2 MB.");
      toast({
        title: "File Size Too Large",
        description: "File size cannot exceed 2 MB.",
        variant: "error",
      });
      return;
    }

    setAvatarFile(file);
    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const handleSave = async (field: EditableField) => {
    if (!user || !field) return;

    setErrorMsg(null);
    setValidationErrors({});

    const payload: {
      name?: string;
      email?: string;
      profile_image?: File | null;
    } = {};

    if (field === "name") {
      payload.name = nameValue.trim();
    } else if (field === "email") {
      payload.email = emailValue.trim();
    } else if (field === "avatar") {
      if (!avatarFile) {
        setErrorMsg("Please select an image file first.");
        return;
      }

      payload.profile_image = avatarFile;
    }

    try {
      setLoading(true);

      const updatedUser = await updateUser(user.id, payload);

      setUser(updatedUser);
      setNameValue(updatedUser.name || "");
      setEmailValue(updatedUser.email || "");
      setAvatarPreview(getStorageUrl(updatedUser.image));

      setValidationErrors({});
      setErrorMsg(null);
      setEditingField(null);
      setAvatarFile(null);

      toast({
        title: "Profile Updated",
        description: "Your profile changes have been saved successfully.",
        variant: "success",
      });
    } catch (err: unknown) {
      console.error("Failed to update profile:", err);

      const errObj = err as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            errors?: ValidationErrors;
          };
        };
        message?: string;
      };

      const status = errObj.response?.status;
      const responseData = errObj.response?.data;

      if (status === 422 && responseData?.errors) {
        setValidationErrors(responseData.errors);
        return;
      }

      const message =
        responseData?.message ||
        errObj.message ||
        "Failed to update your profile. Please try again.";

      setErrorMsg(message);

      toast({
        title: "Update Failed",
        description: message,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingUser) {
    return (
      <div className="flex h-64 w-full items-center justify-center">
        <div className="flex items-center gap-2 text-primary font-medium">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading profile data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {errorMsg && (
        <Alert variant="error" icon={<AlertCircle size={17} />}>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      {/* Header Banner */}
      <div className="clay rounded-[22px] p-6 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="rounded-full bg-primary-soft px-3 py-1 text-[11.5px] font-medium text-primary">
              Account Overview
            </span>
            <h1 className="mt-2 font-display text-[26px] font-medium tracking-tight text-ink sm:text-[32px]">
              Account Profile Settings
            </h1>
            <p className="mt-1 text-[14px] leading-relaxed text-muted">
              Manage your personal information and profile photo on LOCIVA.
            </p>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-[12px] font-semibold capitalize ${
              user?.role === "admin"
                ? "bg-primary-soft text-primary"
                : "bg-[#e8f6ee] text-potential"
            }`}
          >
            {user?.role === "admin" ? (
              <ShieldCheck size={14} />
            ) : (
              <Store size={14} />
            )}
            <span>Role: {user?.role}</span>
          </span>
        </div>
      </div>

      <div className="clay rounded-[22px] p-6 sm:p-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 border-b border-[#ececf6] pb-8">
          <div className="relative group self-center sm:self-auto">
            {/* Avatar Circle */}
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-3xl font-bold text-primary shadow-inner border-2 border-white">
              {currentPhotoUrl ? (
                <img
                  src={currentPhotoUrl}
                  alt={`Foto profil ${user?.name}`}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span>{user?.name?.charAt(0).toUpperCase() || "U"}</span>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleStartEdit("avatar")}
              disabled={loading}
              title="Ganti foto profil"
              className="clay-press absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white shadow-md transition-transform hover:scale-110 disabled:opacity-50"
            >
              <Pencil size={14} />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-[18px] font-semibold text-ink">
                Profile Photo
              </h2>
            </div>
            <p className="text-[13px] text-muted leading-relaxed">
              Supported formats: JPG, JPEG, PNG, or WEBP. Maximum file size: 2
              MB.
            </p>

            {editingField === "avatar" && (
              <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <ClayButton
                  variant="primary"
                  disabled={loading || !avatarFile}
                  onClick={() => handleSave("avatar")}
                  className="!py-1.5 !px-3 text-[12.5px]"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={13} className="animate-spin" />
                      <span>Saving...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Check size={13} />
                      <span>Save Photo</span>
                    </span>
                  )}
                </ClayButton>

                <ClayButton
                  variant="secondary"
                  disabled={loading}
                  onClick={handleCancel}
                  className="!py-1.5 !px-3 text-[12.5px]"
                >
                  <span className="flex items-center gap-1">
                    <X size={13} />
                    <span>Cancel</span>
                  </span>
                </ClayButton>
              </div>
            )}
          </div>
        </div>

        <div className="border-b border-[#ececf6] pb-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] font-medium text-muted uppercase tracking-wider">
              <UserIcon size={14} className="text-primary" />
              <span>Full Name</span>
            </div>

            {editingField !== "name" && (
              <button
                type="button"
                onClick={() => handleStartEdit("name")}
                className="clay-press inline-flex items-center gap-1.5 rounded-[8px] border border-[#ececf6] bg-white px-2.5 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-primary-soft hover:text-primary"
              >
                <Pencil size={13} />
                <span>Edit Name</span>
              </button>
            )}
          </div>

          {editingField === "name" ? (
            <div className="space-y-3">
              <input
                type="text"
                value={nameValue}
                onChange={(e) => {
                  setNameValue(e.target.value);
                  setValidationErrors((prev) => ({
                    ...prev,
                    name: undefined,
                  }));
                }}
                disabled={loading}
                placeholder="Enter your full name"
                className={`clay-inset w-full rounded-[12px] px-4 py-2.5 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 ${
                  validationErrors.name
                    ? "border border-warning"
                    : "focus:border-primary"
                }`}
              />

              {validationErrors.name?.[0] && (
                <p className="flex items-center gap-1 text-[12px] text-warning">
                  <AlertCircle size={13} />
                  {validationErrors.name[0]}
                </p>
              )}

              <div className="flex items-center gap-2.5">
                <ClayButton
                  variant="primary"
                  disabled={loading}
                  onClick={() => handleSave("name")}
                  className="!py-1.5 !px-3 text-[12.5px]"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={13} className="animate-spin" />
                      <span>Saving...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Check size={13} />
                      <span>Save</span>
                    </span>
                  )}
                </ClayButton>

                <ClayButton
                  variant="secondary"
                  disabled={loading}
                  onClick={handleCancel}
                  className="!py-1.5 !px-3 text-[12.5px]"
                >
                  <span className="flex items-center gap-1">
                    <X size={13} />
                    <span>Cancel</span>
                  </span>
                </ClayButton>
              </div>
            </div>
          ) : (
            <p className="text-[16px] font-medium text-ink">{user?.name}</p>
          )}
        </div>

        <div className="border-b border-[#ececf6] pb-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] font-medium text-muted uppercase tracking-wider">
              <Mail size={14} className="text-primary" />
              <span>Email Address</span>
            </div>

            {editingField !== "email" && (
              <button
                type="button"
                onClick={() => handleStartEdit("email")}
                className="clay-press inline-flex items-center gap-1.5 rounded-[8px] border border-[#ececf6] bg-white px-2.5 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-primary-soft hover:text-primary"
              >
                <Pencil size={13} />
                <span>Edit Email</span>
              </button>
            )}
          </div>

          {editingField === "email" ? (
            <div className="space-y-3">
              <input
                type="email"
                value={emailValue}
                onChange={(e) => {
                  setEmailValue(e.target.value);
                  setValidationErrors((prev) => ({
                    ...prev,
                    email: undefined,
                  }));
                }}
                disabled={loading}
                placeholder="Enter your email address"
                className={`clay-inset w-full rounded-[12px] px-4 py-2.5 text-[14px] text-ink focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 ${
                  validationErrors.email
                    ? "border border-warning"
                    : "focus:border-primary"
                }`}
              />

              {validationErrors.email?.[0] && (
                <p className="flex items-center gap-1 text-[12px] text-warning">
                  <AlertCircle size={13} />
                  {validationErrors.email[0]}
                </p>
              )}

              <div className="flex items-center gap-2.5">
                <ClayButton
                  variant="primary"
                  disabled={loading}
                  onClick={() => handleSave("email")}
                  className="!py-1.5 !px-3 text-[12.5px]"
                >
                  {loading ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={13} className="animate-spin" />
                      <span>Saving...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Check size={13} />
                      <span>Save</span>
                    </span>
                  )}
                </ClayButton>

                <ClayButton
                  variant="secondary"
                  disabled={loading}
                  onClick={handleCancel}
                  className="!py-1.5 !px-3 text-[12.5px]"
                >
                  <span className="flex items-center gap-1">
                    <X size={13} />
                    <span>Cancel</span>
                  </span>
                </ClayButton>
              </div>
            </div>
          ) : (
            <p className="text-[16px] font-medium text-ink">{user?.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[12px] font-medium text-muted uppercase tracking-wider">
            <Calendar size={14} className="text-primary" />
            <span>Joined Date</span>
          </div>
          <p className="text-[15px] font-medium text-ink">
            {user?.joinedDate || "-"}
          </p>
        </div>
      </div>
    </div>
  );
}
