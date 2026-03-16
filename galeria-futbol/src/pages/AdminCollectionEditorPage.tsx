import { AdminLayout } from "../features/admin/components/AdminLayout";
import { routes } from "../app/router/routes";
import { navigateTo } from "../shared/utils/navigation";
import styles from "./AdminEditorPage.module.css";

export function AdminCollectionEditorPage() {
  const pathSegments = window.location.pathname.split("/");
  const lastSegment = pathSegments[pathSegments.length - 1];
  const isNew = lastSegment === "new";
  const collectionId = isNew ? null : lastSegment;

  const title = isNew ? "Nueva colección" : `Editar colección #${collectionId}`;

  return (
    <AdminLayout title={title}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.backBtn}
          onClick={() => navigateTo(routes.adminCollections)}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Volver a colecciones
        </button>
        <h2 className={styles.editorTitle}>{title}</h2>
      </div>

      <div className={styles.placeholder}>
        Editor de colección — próximamente
      </div>
    </AdminLayout>
  );
}
