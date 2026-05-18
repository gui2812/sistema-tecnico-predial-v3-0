import Sidebar from './Sidebar';
import Header from './Header';
import AssistenteTecnico from './AssistenteTecnico';

export default function Layout({ children, page, setPage, user }) {
  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <Sidebar page={page} setPage={setPage} user={user}/>

      <main className="flex-1 min-w-0">
        <Header page={page} user={user}/>

        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>

      <AssistenteTecnico />
    </div>
  );
}
