import { Footer } from "@/components/navigation/Footer";
import { ResponsiveGenericToolbar } from "@/components/navigation/ResponsiveGenericToolbar";
import { SignupComponent } from "./SignupComponent";

export function SignupPage() {
  return (
    <div className="flex size-full min-h-screen flex-col items-center justify-center">
      <ResponsiveGenericToolbar>
        <SignupComponent />
        <Footer />
      </ResponsiveGenericToolbar>
    </div>
  );
}
