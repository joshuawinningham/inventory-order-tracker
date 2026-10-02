import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/products', label: 'Products' },
  { to: '/orders', label: 'Orders' },
];

export default function Layout() {
  return (
    <div className="flex h-screen flex-col md:flex-row">
      <nav className="shrink-0 bg-slate-800 text-white md:flex md:w-56 md:flex-col">
        <div className="px-4 py-3 text-lg font-bold tracking-tight md:py-5">
          Order Tracker
        </div>
        <ul className="flex gap-1 px-2 pb-2 md:flex-1 md:flex-col md:pb-0">
          {links.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) =>
                  `block rounded px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main className="flex-1 overflow-auto bg-slate-50 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
