<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Public site content (settings, services, jobs) is loaded once in the root loader via `getSiteContent` and read with `useContent()`; admin edits invalidate that query. Why: one source of truth, SSR-friendly.
- `/admin` is a client-only route using the browser client with RLS; admin rights come from `user_roles` (first signup becomes admin). Why: simple single-admin setup without server functions.
- Uploaded images go to the private `site-media` bucket and are stored as long-lived signed URLs, because public buckets are blocked in this workspace.
