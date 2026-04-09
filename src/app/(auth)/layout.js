export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#F5F2E8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
