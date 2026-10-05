import { translations } from "@/lib/i18n";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { Camera, KeyRound, Mail, Phone, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { supabaseErrorText } from "@/lib/supa-error";
import { uploadImage } from "@/lib/media";
import { AccountHeader } from "@/components/account/AccountShell";
import { IdentityAvatar } from "@/components/ligo/IdentityAvatar";
import { InlineSpinner, SectionHeading } from "@/components/account/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/hooks/useLanguage";

export const Route = createFileRoute("/account/profile")({
  head: () => ({
    meta: [
      { title: translations.en.ap_meta_title },
      { name: "description", content: translations.en.ap_meta_desc },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useLanguage();
  const { user, profile, refresh } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
  }, [profile]);

  const profileDirty = fullName !== (profile?.full_name ?? "") || phone !== (profile?.phone ?? "");

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (fullName.trim().length < 2) {
      toast.error(t("prof_name_required"));
      return;
    }
    if (phone.trim() && phone.trim().length < 9) {
      toast.error(t("prof_invalid_phone"));
      return;
    }
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("id", user.id);
    setSavingProfile(false);
    if (error) {
      toast.error(supabaseErrorText(t, error));
      return;
    }
    await refresh();
    toast.success(t("prof_updated"));
  };

  const onAvatarPicked = async (file: File | null) => {
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const path = await uploadImage(file, "avatars");
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: path })
        .eq("id", user.id);
      if (error) throw error;
      await refresh();
      toast.success(t("prof_photo_updated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("prof_upload_failed"));
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <AccountHeader title={t("prof_title")} description={t("prof_desc")} />

      {/* Identity */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <SectionHeading title={t("prof_photo")} />
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <IdentityAvatar
            path={profile?.avatar_url}
            name={profile?.full_name}
            className="h-20 w-20 text-2xl"
          />
          <div className="min-w-0 space-y-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onAvatarPicked(e.target.files?.[0] ?? null)}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={uploadingAvatar}
              onClick={() => fileRef.current?.click()}
            >
              <Camera className="mr-2 h-4 w-4" />
              {uploadingAvatar ? t("prof_uploading") : t("prof_change_photo")}
            </Button>
            <p className="text-xs text-muted-foreground">{t("prof_photo_hint")}</p>
          </div>
        </div>
      </section>

      {/* Personal details */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <SectionHeading title={t("prof_personal_info")} />
        <form onSubmit={saveProfile} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pf-name">{t("prof_full_name")}</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="pf-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="pf-phone">{t("prof_phone_number")}</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="pf-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-9"
                  inputMode="tel"
                  placeholder="+251…"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pf-email">{t("prof_email")}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="pf-email" value={user?.email ?? ""} className="pl-9" disabled />
              </div>
              <p className="text-xs text-muted-foreground">{t("prof_email_hint")}</p>
            </div>
          </div>
          <Button type="submit" disabled={savingProfile || !profileDirty}>
            {savingProfile ? t("prof_saving") : t("prof_save_changes")}
          </Button>
        </form>
      </section>

      {/* Security */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-card">
        <SectionHeading title={t("prof_security")} description={t("prof_security_desc")} />
        <PasswordForm />
        <Separator className="my-5" />
        <div className="flex items-start gap-3 rounded-lg bg-surface p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-semibold">{t("prof_protected")}</p>
            <p className="text-muted-foreground">{t("prof_protected_desc")}</p>
          </div>
        </div>
      </section>
    </>
  );
}

function PasswordForm() {
  const { t } = useLanguage();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 6) {
      toast.error(t("prof_pw_min"));
      return;
    }
    if (next !== confirm) {
      toast.error(t("prof_pw_mismatch"));
      return;
    }
    if (!user?.email) {
      toast.error(t("prof_verify_failed"));
      return;
    }
    setBusy(true);
    // Re-authenticate with the current password before allowing the change.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: current,
    });
    if (signInError) {
      setBusy(false);
      toast.error(t("prof_current_incorrect"));
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (error) {
      toast.error(supabaseErrorText(t, error));
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    toast.success(t("prof_pw_changed"));
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="pw-current">{t("prof_current_pw")}</Label>
        <Input
          id="pw-current"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pw-new">{t("prof_new_pw")}</Label>
          <Input
            id="pw-new"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pw-confirm">{t("prof_confirm_pw")}</Label>
          <Input
            id="pw-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
            minLength={6}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" disabled={busy}>
          <KeyRound className="mr-2 h-4 w-4" />
          {busy ? t("prof_updating") : t("prof_change_pw")}
        </Button>
        {busy && <InlineSpinner label={t("prof_securing")} />}
      </div>
    </form>
  );
}
