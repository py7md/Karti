package com.dahshah.calculator.data;

import android.content.Context;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Local repository providing high-level abstraction over Room DB tables for MVVM architecture.
 */
public class LocalRepository {
    private final AppDao appDao;
    private final ExecutorService executorService;

    public LocalRepository(Context context) {
        AppDatabase db = AppDatabase.getDatabase(context);
        this.appDao = db.appDao();
        this.executorService = Executors.newFixedThreadPool(4); // Multithreading pool
    }

    // --- Async / Sync Sales Operations ---
    public void getSalesForSerial(String serial, Callback<List<SaleRecordEntity>> callback) {
        executorService.execute(() -> {
            List<SaleRecordEntity> sales = appDao.getSalesForSerial(serial);
            callback.onComplete(sales);
        });
    }

    public void insertSale(SaleRecordEntity sale) {
        executorService.execute(() -> appDao.insertSale(sale));
    }

    public void insertSales(List<SaleRecordEntity> sales) {
        executorService.execute(() -> appDao.insertSales(sales));
    }

    public void deleteSaleById(String saleId) {
        executorService.execute(() -> appDao.deleteSaleById(saleId));
    }

    public void clearSalesForSerial(String serial) {
        executorService.execute(() -> appDao.clearSalesForSerial(serial));
    }

    // --- Async / Sync Shops Operations ---
    public void getShopsForSerial(String serial, Callback<List<ShopEntity>> callback) {
        executorService.execute(() -> {
            List<ShopEntity> shops = appDao.getShopsForSerial(serial);
            callback.onComplete(shops);
        });
    }

    public void insertShop(ShopEntity shop) {
        executorService.execute(() -> appDao.insertShop(shop));
    }

    public void insertShops(List<ShopEntity> shops) {
        executorService.execute(() -> appDao.insertShops(shops));
    }

    public void deleteShopById(String shopId) {
        executorService.execute(() -> appDao.deleteShopById(shopId));
    }

    public void clearShopsForSerial(String serial) {
        executorService.execute(() -> appDao.clearShopsForSerial(serial));
    }

    /**
     * Interface callback for async operations.
     */
    public interface Callback<T> {
        void onComplete(T result);
    }
}
