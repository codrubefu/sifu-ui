import { Navigate, Route, Routes } from 'react-router-dom';
import ArticleCreate from './ArticleCreate';
import ArticleDetails from './ArticleDetails';
import ArticleEdit from './ArticleEdit';
import ArticlesList from './ArticlesList';

export function ArticlesModuleRoutes() {
  return (
    <Routes>
      <Route path="" element={<ArticlesList />} />
      <Route path="articles" element={<ArticlesList />} />
      <Route path="create" element={<ArticleCreate />} />
      <Route path="articles/create" element={<ArticleCreate />} />
      <Route path=":id" element={<ArticleDetails />} />
      <Route path="articles/:id" element={<ArticleDetails />} />
      <Route path=":id/edit" element={<ArticleEdit />} />
      <Route path="articles/:id/edit" element={<ArticleEdit />} />
      <Route path="*" element={<Navigate to="/erp/articles" replace />} />
    </Routes>
  );
}
