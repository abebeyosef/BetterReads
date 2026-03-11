import { SunsetIllo } from "@/components/illustrations/SunsetIllo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {children}
      </div>
      <div className="w-full max-w-lg mt-8 opacity-80">
        <SunsetIllo className="w-full" />
      </div>
    </div>
  );
}
