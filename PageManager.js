// PageManager.js - Handles switching between different pages/screens
export class PageManager {
  constructor() {
    this.currentPage = null;
    this.pages = new Map();
    console.log('📄 PageManager initialized');
  }

  registerPage(name, pageInstance) {
    this.pages.set(name, pageInstance);
    console.log(`📄 Registered page: ${name}`);
  }

  async showPage(pageName, data = null) {
    // Hide current page if exists
    if (this.currentPage) {
      await this.currentPage.hide();
    }

    // Get and show new page
    const page = this.pages.get(pageName);
    if (!page) {
      console.error(`❌ Page not found: ${pageName}`);
      return;
    }

    this.currentPage = page;
    await page.show(data);
    console.log(`📄 Switched to page: ${pageName}`);
  }

  getCurrentPage() {
    return this.currentPage;
  }

  // Clean up all pages
  dispose() {
    for (const page of this.pages.values()) {
      if (page.dispose) {
        page.dispose();
      }
    }
    this.pages.clear();
  }
}
