import { Footer } from "@/components/navigation/Footer";
import { ResponsiveGenericToolbar } from "@/components/navigation/ResponsiveGenericToolbar";
import { SignupComponent } from "./SignupComponent";

export function SignupPage() {
  return (
    <div className="flex h-full min-h-screen w-full flex-col items-center justify-center">
      <ResponsiveGenericToolbar>
        <SignupComponent />
        <Footer />
      </ResponsiveGenericToolbar>
    </div>
  );
}
