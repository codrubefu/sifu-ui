import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '../../ProtectedRoute';
import { EventsListPage } from './EventsListPage';
import { EventCalendarPage } from './EventCalendarPage';
import { EventCategoriesPage } from './EventCategoriesPage';
import { EventForm } from './EventForm';
import { EventDetailsPage } from './EventDetailsPage';

export function EventsModuleRoutes() {
  return (
    <Routes>
      <Route path="" element={<ProtectedRoute requiredRights={['events.view', 'events.manage']}><EventsListPage /></ProtectedRoute>} />
      <Route path="events" element={<ProtectedRoute requiredRights={['events.view', 'events.manage']}><EventsListPage /></ProtectedRoute>} />
      <Route path="calendar" element={<ProtectedRoute requiredRights={['events.view', 'events.manage']}><EventCalendarPage /></ProtectedRoute>} />
      <Route path="events/calendar" element={<ProtectedRoute requiredRights={['events.view', 'events.manage']}><EventCalendarPage /></ProtectedRoute>} />
      <Route path="categories" element={<ProtectedRoute requiredRights={['events.manage']}><EventCategoriesPage /></ProtectedRoute>} />
      <Route path="events/categories" element={<ProtectedRoute requiredRights={['events.manage']}><EventCategoriesPage /></ProtectedRoute>} />
      <Route path="new" element={<ProtectedRoute requiredRights={['events.manage']}><EventForm mode="create" /></ProtectedRoute>} />
      <Route path="events/new" element={<ProtectedRoute requiredRights={['events.manage']}><EventForm mode="create" /></ProtectedRoute>} />
      <Route path=":eventId" element={<ProtectedRoute requiredRights={['events.view', 'events.manage']}><EventDetailsPage /></ProtectedRoute>} />
      <Route path="events/:eventId" element={<ProtectedRoute requiredRights={['events.view', 'events.manage']}><EventDetailsPage /></ProtectedRoute>} />
      <Route path=":eventId/edit" element={<ProtectedRoute requiredRights={['events.manage']}><EventForm mode="edit" /></ProtectedRoute>} />
      <Route path="events/:eventId/edit" element={<ProtectedRoute requiredRights={['events.manage']}><EventForm mode="edit" /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/erp/events" replace />} />
    </Routes>
  );
}
