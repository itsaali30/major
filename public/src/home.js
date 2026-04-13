// Home Component
const Home = {
  template: `
    <div>
      <section class="hero-section text-center">
        <div class="container">
          <h1 class="display-4 fw-bold">Welcome to ShopHub</h1>
          <p class="lead">Your one-stop destination for amazing products</p>
          <router-link to="/signup" class="btn btn-light btn-lg mt-3" v-if="!$root.isLoggedIn">Get Started</router-link>
          <router-link to="/profile" class="btn btn-light btn-lg mt-3" v-else>View Profile</router-link>
        </div>
      </section>
      <section class="container my-5">
        <h2 class="text-center mb-4">Featured Products</h2>
        <div class="row">
          <div class="col-md-4 mb-4" v-for="product in products" :key="product.id">
            <div class="card h-100">
              <img :src="product.image" class="card-img-top" :alt="product.name" style="height: 200px; object-fit: cover;">
              <div class="card-body">
                <h5 class="card-title">{{ product.name }}</h5>
                <p class="card-text">{{ product.description }}</p>
                <p class="card-text"><strong>$ {{ product.price }}</strong></p>
                <button class="btn btn-primary">Add to Cart</button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section class="container my-5">
        <div class="row text-center">
          <div class="col-md-4">
            <i class="bi bi-truck display-4 text-primary"></i>
            <h4>Free Shipping</h4>
            <p>On orders over $50</p>
          </div>
          <div class="col-md-4">
            <i class="bi bi-shield-check display-4 text-success"></i>
            <h4>Secure Payment</h4>
            <p>100% secure checkout</p>
          </div>
          <div class="col-md-4">
            <i class="bi bi-arrow-counterclockwise display-4 text-warning"></i>
            <h4>Easy Returns</h4>
            <p>30-day return policy</p>
          </div>
        </div>
      </section>
    </div>
  `,
  data() {
    return {
      products: [
        { id: 1, name: 'Wireless Headphones', description: 'High-quality wireless headphones with noise cancellation', price: 99.99, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400' },
        { id: 2, name: 'Smart Watch', description: 'Track your fitness and stay connected', price: 199.99, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400' },
        { id: 3, name: 'Laptop Stand', description: 'Ergonomic aluminum laptop stand', price: 49.99, image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400' },
      ]
    };
  }
};

// Export for ES modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Home;
}
