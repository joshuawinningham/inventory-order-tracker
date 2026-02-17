import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/products', label: 'Products' },
  { to: '/orders', label: 'Orders' },
];

export default function Layout() {
  return (
    <div className="flex h-screen">
      <nav className="w-56 bg-slate-800 text-white flex flex-col">
        <div className="px-4 py-5 text-lg font-bold tracking-tight">
          Order Tracker
        </div>
        <ul className="flex-1 space-y-1 px-2">
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
      <main className="flex-1 overflow-auto bg-slate-50 p-6">
        <Outlet />
      </main>
    </div>
  );
}
