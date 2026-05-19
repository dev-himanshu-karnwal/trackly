import { UserCreateForm } from "@/components/admin/user-create-form";

export default function AdminNewUserPage() {
  return (
    <div>
      <h2 className="mb-6 text-lg font-medium">Create user</h2>
      <UserCreateForm />
    </div>
  );
}
