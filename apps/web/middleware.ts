import { withAuth } from "next-auth/middleware"

export default withAuth({
  pages: { signIn: "/login" },
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/clients/:path*",
    "/campaigns/:path*",
    "/editor/:path*",
    "/pieces/:path*",
    "/medias/:path*",
    "/approvals/:path*",
    "/deliveries/:path*",
    "/account/:path*",
  ],
}
