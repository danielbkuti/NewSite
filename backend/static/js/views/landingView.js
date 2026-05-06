export function renderLanding(app) {
  app.innerHTML = `
    <div class="p-6 text-center">
      <h1 class="text-2xl font-bold mb-4">Welcome to FlexMaster</h1>

      <div class="space-x-4">
        <a href="/user/login/" 
           class="bg-blue-500 text-white px-4 py-2 rounded">
          Login
        </a>

        <a href="/user/signup/" 
           class="bg-gray-500 text-white px-4 py-2 rounded">
          Register
        </a>
      </div>
    </div>
  `;
}