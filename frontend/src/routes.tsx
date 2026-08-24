import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ClientsList } from './pages/clients/List';
import { ClientForm } from './pages/clients/Form';
import { ProductsList } from './pages/products/List';
import { ProductForm } from './pages/products/Form';
import { BudgetsList } from './pages/budgets/List';
import { BudgetWizard } from './pages/budgets/Wizard';
import { BudgetDetail } from './pages/budgets/Detail';
import { VendedoresList } from './pages/vendedores/List';
import { VendedorForm } from './pages/vendedores/Form';
import { LeadsList } from './pages/leads/List';
import { NotFound } from './pages/NotFound';

export const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/login', element: <Login /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/clientes', element: <ClientsList /> },
          { path: '/clientes/novo', element: <ClientForm /> },
          { path: '/clientes/:id/editar', element: <ClientForm /> },
          { path: '/produtos', element: <ProductsList /> },
          { path: '/produtos/novo', element: <ProductForm /> },
          { path: '/produtos/:id/editar', element: <ProductForm /> },
          { path: '/orcamentos', element: <BudgetsList /> },
          { path: '/orcamentos/novo', element: <BudgetWizard /> },
          { path: '/orcamentos/:id', element: <BudgetDetail /> },
          { path: '/orcamentos/:id/editar', element: <BudgetWizard /> },
          { path: '/vendedores', element: <VendedoresList /> },
          { path: '/vendedores/novo', element: <VendedorForm /> },
          { path: '/pedidos-site', element: <LeadsList /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
