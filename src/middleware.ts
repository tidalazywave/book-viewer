import { withAuth } from "next-auth/middleware";

export default withAuth({
    callbacks: {
        authorized: ({ token }) => !!token,
    },
});

export const config = {
    // マッチャーを修正: login, api, static assets, public files 以外はすべて保護対象
    matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico|books/).*)"],
};
