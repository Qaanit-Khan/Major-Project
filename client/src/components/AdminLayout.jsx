import TopNavbar from './TopNavbar';

export default function AdminLayout({ children, title, subtitle, onRefresh, refreshing }) {
  return (
    <div className="admin-layout mosaic-bg">
      <TopNavbar onRefresh={onRefresh} refreshing={refreshing} />
      <div className="admin-main" style={{ position: 'relative', zIndex: 1, paddingTop: 64 }}>
        <div className="page-content page-fade-in">
          {title && (
            <div className="page-header" style={{ marginBottom: 24 }}>
              <h1 className="page-title">{title}</h1>
              {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
