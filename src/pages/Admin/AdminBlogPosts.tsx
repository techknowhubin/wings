// Blog Posts management is now exclusively in the Admin Dashboard.
// Reuses the existing HostBlogPosts component with an admin context wrapper.
import HostBlogPosts from '@/pages/HostBlogPosts';

export default function AdminBlogPosts() {
  return <HostBlogPosts />;
}
