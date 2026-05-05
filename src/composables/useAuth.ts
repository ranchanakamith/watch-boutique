import { ref } from 'vue';

const savedToken = localStorage.getItem('boutique_token');
const savedUser = localStorage.getItem('boutique_user');

const isAuthenticated = ref(!!savedToken);
const user = ref(savedUser ? JSON.parse(savedUser) : null);
const token = ref(savedToken || null);
const isLoading = ref(false);
const error = ref<string | null>(null);

export function useAuth() {
  
  // NEW: Register function to save custom users locally
  const register = async (email: string, password: string, name: string) => {
    isLoading.value = true;
    error.value = null;

    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const newUser = {
        id: Date.now(),
        username: email.split('@')[0],
        email: email.trim(),
        name: name.trim(),
        // Generate a cool profile picture based on their name
        image: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=C5A059&color=fff`
      };

      // Save to our local "database"
      const existingUsers = JSON.parse(localStorage.getItem('boutique_custom_users') || '[]');
      
      // Check if email already exists
      if (existingUsers.some((u: any) => u.email === email.trim())) {
        throw new Error("An account with this email already exists.");
      }

      existingUsers.push({ ...newUser, password: password.trim() });
      localStorage.setItem('boutique_custom_users', JSON.stringify(existingUsers));

      // Automatically log them in after registering
      const fakeToken = 'mock_jwt_' + Date.now();
      token.value = fakeToken;
      user.value = newUser;
      isAuthenticated.value = true;

      localStorage.setItem('boutique_token', fakeToken);
      localStorage.setItem('boutique_user', JSON.stringify(user.value));

      return true;
    } catch (err: any) {
      error.value = err.message || 'Registration failed';
      alert(`Registration failed: ${err.message}`);
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const login = async (username = 'emilys', password = 'emilyspass') => {
    isLoading.value = true;
    error.value = null;
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    try {
      // 1. Check local "database" for custom registered users FIRST
      const existingUsers = JSON.parse(localStorage.getItem('boutique_custom_users') || '[]');
      const customUser = existingUsers.find((u: any) => 
        (u.email === cleanUsername || u.username === cleanUsername) && u.password === cleanPassword
      );

      if (customUser) {
        // Log in the custom user locally
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
        const fakeToken = 'mock_jwt_' + Date.now();
        token.value = fakeToken;
        user.value = {
          id: customUser.id,
          username: customUser.username,
          email: customUser.email,
          name: customUser.name,
          image: customUser.image
        };
        isAuthenticated.value = true;
        localStorage.setItem('boutique_token', fakeToken);
        localStorage.setItem('boutique_user', JSON.stringify(user.value));
        return true;
      }

      // 2. If not a custom user, hit the DummyJSON API (Rubric Requirement)
      const response = await fetch('https://dummyjson.com/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUsername,
          password: cleanPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Invalid credentials.');
      }

      const authToken = data.accessToken || data.token;

      if (!authToken) throw new Error('No token returned.');

      token.value = authToken;
      user.value = {
        id: data.id,
        username: data.username,
        email: data.email,
        name: `${data.firstName} ${data.lastName}`,
        image: data.image
      };
      
      isAuthenticated.value = true;
      localStorage.setItem('boutique_token', authToken);
      localStorage.setItem('boutique_user', JSON.stringify(user.value));

      return true; 
    } catch (err: any) {
      error.value = err.message || 'Failed to sign in';
      alert(`Authentication failed: ${err.message}`);
      return false; 
    } finally {
      isLoading.value = false;
    }
  };

  const logout = () => {
    isAuthenticated.value = false;
    user.value = null;
    token.value = null;
    localStorage.removeItem('boutique_token');
    localStorage.removeItem('boutique_user');
  };

  return { isAuthenticated, user, token, isLoading, error, login, register, logout };
}