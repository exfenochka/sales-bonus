// Функция для расчета выручки с учетом скидки
function calculateSimpleRevenue(purchase, _product) {
    const discountMultiplier = 1 - (purchase.discount / 100);
    const revenue = purchase.sale_price * purchase.quantity * discountMultiplier;
    return revenue;
}

// Функция для расчета бонуса на основе позиции в рейтинге
function calculateBonusByProfit(index, total, seller) {
    const { profit } = seller

    if (index === 0) {
        return profit * 0.15;
    } else if (index === 1 || index === 2) {
        return profit * 0.10;
    } else if (index === total - 1) {
        return 0;
    } else {
        return profit * 0.05;
    }
}

function analyzeSalesData(data, options) {
    if (!data 
        || !Array.isArray(data.sellers) || data.sellers.length === 0
        || !Array.isArray(data.products) || data.products.length === 0
        || !Array.isArray(data.purchase_records) || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // Проверка наличия опций
    const { calculateRevenue, calculateBonus } = options;
    
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Не переданы необходимые функции для расчетов');
    }

    // Подготовка промежуточных данных для сбора статистики
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // Индексация продавцов и товаров для быстрого доступа
    const sellerIndex = {};
    sellerStats.forEach(seller => {
        sellerIndex[seller.id] = seller;
    });

    const productIndex = {};
    data.products.forEach(product => {
        productIndex[product.sku] = product;
    });

    // Расчёт выручки и прибыли для каждого продавца
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        
        if (seller) {
            // Увеличиваем количество продаж
            seller.sales_count += 1;
            
            // Увеличиваем общую выручку на сумму чека
            seller.revenue += record.total_amount;

            // Обрабатываем каждый товар в чеке
            record.items.forEach(item => {
                const product = productIndex[item.sku];
                
                if (product) {
                    // Рассчитываем себестоимость товара
                    const cost = product.purchase_price * item.quantity;
                    
                    // Рассчитываем выручку с учетом скидки
                    const revenue = calculateRevenue(item, product);
                    
                    // Рассчитываем прибыль: выручка - себестоимость
                    const itemProfit = revenue - cost;
                    
                    // Увеличиваем общую прибыль продавца
                    seller.profit += itemProfit;

                    // Учитываем количество проданных товаров
                    if (!seller.products_sold[item.sku]) {
                        seller.products_sold[item.sku] = 0;
                    }
                    seller.products_sold[item.sku] += item.quantity;
                }
            });
        }
    });

    // Сортировка продавцов по прибыли (по убыванию)
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Назначение премий на основе ранжирования
    sellerStats.forEach((seller, index) => {
        // Рассчитываем бонус
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        
        // Формируем топ-10 товаров
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Подготовка итоговой коллекции с нужными полями
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}