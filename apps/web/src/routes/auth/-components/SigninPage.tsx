import { Footer } from "@/components/navigation/Footer";
import { ResponsiveGenericToolbar } from "@/components/navigation/ResponsiveGenericToolbar";
import { Spinner } from "@/components/ui/spinner";
import { deviceSessionsQueryOptions } from "@/data-access-layer/auth/device-sessions";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { SessionPicker } from "./SessionPicker";
import { SigninComponent } from "./SigninComponent";

export function SigninPage() {
  const [showSigninForm, setShowSigninForm] = useState(false);
  const { data: sessions = [], isLoading } = useQuery(deviceSessionsQueryOptions);
  const hasDeviceSessions = sessions.length > 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <ResponsiveGenericToolbar>
        <div className="flex min-h-screen flex-col">
          {isLoading ? (
            <div className="flex h-full flex-1 items-center justify-center">
              <Spinner className="size-6" />
            </div>
          ) : !hasDeviceSessions ? (
            <SigninComponent />
          ) : showSigninForm ? (
            <SigninComponent onBackToSessions={() => setShowSigninForm(false)} />
          ) : (
            <SessionPicker onUseAnotherAccount={() => setShowSigninForm(true)} />
          )}
        </div>
        <Footer />
      </ResponsiveGenericToolbar>
    </div>
  );
}
