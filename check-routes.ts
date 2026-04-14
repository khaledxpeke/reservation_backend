import app from './src/app';

const routes: string[] = [];

app._router.stack.forEach((middleware: any) => {
  if (middleware.route) { // routes registered directly on the app
    routes.push(middleware.route.path);
  } else if (middleware.name === 'router') { // router middleware 
    middleware.handle.stack.forEach((handler: any) => {
      let route;
      const path = middleware.regexp.toString().replace('/^\\/?(?=\\/|$)/i', '').replace('\\/', '/').replace('(?:\\/(?=$))?(?=\\/|$)/i', '');
      
      if (handler.route) {
        route = handler.route;
      }
      if (route) {
        const methods = Object.keys(route.methods).join(', ').toUpperCase();
        routes.push(`${methods} /api/reservations${route.path}`);
      }
    });
  }
});

console.log(routes);
