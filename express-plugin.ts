import { PluginOption } from "vite";

export default function express(path: string): PluginOption[] {
  return [
    {
      name: "vite3-plugin-express",
      configureServer: async (server) => {
        server.middlewares.use(async (req, res, next) => {
          process.env["VITE"] = "true";
          try {
            const { app } = await server.ssrLoadModule(path);
            app(req, res, next);
          } catch (err) {
            console.error(err);
          }
        });
      },
    },
  ];
}
