import { TopNav } from "./TopNav"

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav />
      <main className="flex-1 overflow-y-auto bg-[#F5F5F0]">
        {children}
      </main>
    </div>
  )
}
