import { useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";

import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { PushButton } from "./PushButton";
import { Spinner } from "./ui/spinner";

export function AuthScreen() {
  const [phone, setPhone] = useState("+48");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(
    null,
  );

  const [loading, setLoading] = useState(false);
  const [hasOtpError, setHasOtpError] = useState(false);
  const [otpKey, setOtpKey] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [tooManyRequestsError, setTooManyRequestsError] = useState(false);

  const hasSubmittedRef = useRef(false);

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" },
      );
    }
  };

  const onSendSMS = async () => {
    try {
      setLoading(true);
      setTooManyRequestsError(false);
      setupRecaptcha();
      const verifier = (window as any).recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phone, verifier);
      setConfirmation(result);
    } catch (err) {
      if (
        err instanceof FirebaseError &&
        err.code === "auth/too-many-requests"
      ) {
        setTooManyRequestsError(true);
      } else {
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const onVerifyCode = async () => {
    if (!confirmation || hasSubmittedRef.current) return;

    try {
      hasSubmittedRef.current = true;
      setLoading(true);
      setHasOtpError(false);

      await confirmation.confirm(otp);
      setIsVerified(true);
    } catch (err) {
      hasSubmittedRef.current = false;
      setOtp("");
      setHasOtpError(true);
      setOtpKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (otp.length === 6) {
      onVerifyCode();
    }
  }, [otp]);

  useEffect(() => {
    if (loading) {
      (document.activeElement as HTMLElement | null)?.blur();
    }
  }, [loading]);

  const handleOtpChange = (value: string) => {
    setOtp(value);
    if (hasOtpError) setHasOtpError(false);
  };

  const handlePhoneChange = (value: string) => {
    setPhone(value);
    if (tooManyRequestsError) setTooManyRequestsError(false);
  };

  return (
    <div className="flex flex-col gap-6 p-8 items-center justify-center h-screen">
      <div id="recaptcha-container" />

      {!confirmation && (
        <>
          <Input
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="+48 600 000 000"
            autoFocus
          />

          <PushButton
            onClick={onSendSMS}
            disabled={phone.length < 9}
            isLoading={loading}
            tooManyRequests={tooManyRequestsError}
          />
          <p className="text-xs text-muted-foreground text-center">
            This site is protected by reCAPTCHA and the Google{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Privacy Policy
            </a>{" "}
            and{" "}
            <a
              href="https://policies.google.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Terms of Service
            </a>{" "}
            apply.
          </p>
        </>
      )}

      {confirmation && !isVerified && (
        <div className="relative w-full max-w-xs flex justify-center">
          <InputOTP
            key={otpKey}
            maxLength={6}
            value={otp}
            onChange={handleOtpChange}
            autoFocus
            disabled={loading}
          >
            <InputOTPGroup
              className={[
                "flex justify-center rounded-md p-2 transition-colors",
                hasOtpError && "animate-[shake_0.35s_ease-in-out]",
              ].join(" ")}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-md">
              <Spinner />
            </div>
          )}
        </div>
      )}

      {isVerified && (
        <div className="flex items-center justify-center">
          <Spinner />
        </div>
      )}
    </div>
  );
}
