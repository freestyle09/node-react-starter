import React, {lazy, Suspense} from 'react';
import {Switch, Route, Redirect} from 'react-router-dom';

const Home = lazy(() => import('./components/Home'));
const NotFound = lazy(() => import('./components/NotFound'));

function App() {
  return (
    <div>
      <Suspense
        fallback={
          <div>
            <h1>Loading...</h1>
          </div>
        }
      >
        <Switch>
          <Route strict exact path="/" component={Home} />
          <Route strict exact path="/404" component={NotFound} />
          <Redirect to="/404" />
        </Switch>
      </Suspense>
    </div>
  );
}

export default App;
