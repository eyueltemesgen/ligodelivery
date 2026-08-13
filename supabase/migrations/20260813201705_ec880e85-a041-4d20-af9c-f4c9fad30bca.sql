
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE admin_exists boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',''),
    NEW.raw_user_meta_data->>'phone',
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;

  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO admin_exists;
  IF NOT admin_exists THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'admin') ON CONFLICT DO NOTHING;
  END IF;

  IF COALESCE(NEW.raw_user_meta_data->>'role','customer') = 'rider' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'rider') ON CONFLICT DO NOTHING;
    INSERT INTO public.riders (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'customer') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

INSERT INTO public.categories (name, slug, sort_order) VALUES
 ('Restaurants','restaurants',1),
 ('Cafes','cafes',2),
 ('Grocery','grocery',3),
 ('Supermarket','supermarket',4),
 ('Bakery','bakery',5),
 ('Pharmacy','pharmacy',6),
 ('Electronics','electronics',7),
 ('Cosmetics','cosmetics',8);

INSERT INTO public.shops (name, description, category_id, phone, address, lat, lng, delivery_fee, delivery_time_min, rating, is_featured)
VALUES
 ('Kuriftu Kitchen','Ethiopian and continental dishes by the lake.', (SELECT id FROM public.categories WHERE slug='restaurants'), '+251911111111', 'Lake Babogaya Road, Bishoftu', 8.7510, 38.9840, 60, 30, 4.7, true),
 ('Adama Burger House','Burgers, fries and shakes made fresh.', (SELECT id FROM public.categories WHERE slug='restaurants'), '+251911111112', 'Bishoftu Main Street', 8.7480, 38.9790, 50, 25, 4.5, true),
 ('Tana Cafe','Specialty Ethiopian coffee and pastries.', (SELECT id FROM public.categories WHERE slug='cafes'), '+251911111113', 'Debre Zeyit Road, Bishoftu', 8.7532, 38.9765, 40, 20, 4.6, true),
 ('Bishoftu Fresh Market','Daily fresh vegetables, fruit and staples.', (SELECT id FROM public.categories WHERE slug='grocery'), '+251911111114', 'Kebele 05, Bishoftu', 8.7455, 38.9812, 55, 35, 4.4, false),
 ('Selam Supermarket','Everything for the home in one place.', (SELECT id FROM public.categories WHERE slug='supermarket'), '+251911111115', 'Airport Road, Bishoftu', 8.7398, 38.9881, 70, 40, 4.3, false),
 ('Genet Bakery','Bread, cakes and Ethiopian pastries baked daily.', (SELECT id FROM public.categories WHERE slug='bakery'), '+251911111116', 'Kebele 02, Bishoftu', 8.7521, 38.9723, 45, 25, 4.8, true);

INSERT INTO public.products (shop_id, category_id, name, description, price, discount_percent, is_featured, is_popular)
SELECT s.id, s.category_id, v.name, v.description, v.price, v.discount, v.featured, v.popular
FROM (VALUES
 ('Kuriftu Kitchen','Doro Wat','Slow cooked chicken stew with injera and egg.',320,0,true,true),
 ('Kuriftu Kitchen','Beyaynetu','Assorted vegetarian platter served on injera.',260,10,false,true),
 ('Kuriftu Kitchen','Tibs Special','Pan fried beef with rosemary and onion.',420,0,true,false),
 ('Adama Burger House','Classic Burger','Beef patty, cheddar, lettuce and house sauce.',250,0,true,true),
 ('Adama Burger House','Double Cheese Burger','Two patties with double cheese and fries.',390,15,false,true),
 ('Adama Burger House','Crispy Chicken Wrap','Fried chicken, garlic sauce and salad.',230,0,false,false),
 ('Tana Cafe','Macchiato','Traditional Ethiopian macchiato.',45,0,false,true),
 ('Tana Cafe','Cappuccino','Rich espresso with steamed milk.',70,0,true,false),
 ('Tana Cafe','Cheesecake Slice','Creamy cheesecake with berry sauce.',180,10,false,false),
 ('Bishoftu Fresh Market','Tomatoes 1kg','Fresh local tomatoes.',60,0,false,true),
 ('Bishoftu Fresh Market','Red Onion 1kg','Farm fresh red onions.',75,0,false,false),
 ('Bishoftu Fresh Market','Avocado 1kg','Creamy ripe avocados.',90,5,true,true),
 ('Selam Supermarket','Fresh Milk 1L','Pasteurised full cream milk.',90,0,false,true),
 ('Selam Supermarket','Sunflower Oil 3L','Cooking oil, 3 litre bottle.',640,10,true,false),
 ('Selam Supermarket','Rice 5kg','Long grain white rice.',720,0,false,false),
 ('Genet Bakery','Fresh Bread Loaf','Soft bread baked this morning.',55,0,false,true),
 ('Genet Bakery','Birthday Cake','Vanilla cream cake, serves 8.',850,0,true,true),
 ('Genet Bakery','Sambusa (5 pcs)','Crispy lentil sambusa.',100,0,false,false)
) AS v(shop, name, description, price, discount, featured, popular)
JOIN public.shops s ON s.name = v.shop;
