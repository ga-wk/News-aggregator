import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Button,
  FlatList,
  TextInput,
  Linking,
  RefreshControl,
} from "react-native";
import { Card } from "react-native-elements";
import {
  everything,
  topHeadlines,
  categories,
  general,
  all,
  btnCategories,
  dateFrom,
  dateTo,
  btnSearch,
  modeDate,
  newsUrlToImage,
  newsDescription,
  newsUrl,
  newsPublishedAt,
  articles,
  newsTitle,
  requestStatus,
  requestMessage,
  requestError,
  dateSeparator,
} from "../consts/new";
import { key } from "../consts/public";
import DateTimePicker from "@react-native-community/datetimepicker";
import { db } from "../localdb/db";
import {
  dbCountries,
  dbDefaultCountry,
  dbSetting,
  sourceIsEnabled,
  sourceName,
} from "../consts/db";

export const News = () => {
  //style
  const [categoriesVisible, setCategoriesVisible] = useState(false);
  const newsList = useRef(null);

  //пока так
  const pageFirst = 1;
  const size = 10;
  const [country, setCountry] = useState(false);

  //заглушка
  const plug = [
    {
      author: "Rebecca Bellan",
      title: "Новостей нет",
      description: "Попробуйте выбрать другие источники",
      url: "",
      urlToImage: "",
      publishedAt: "",
    },
  ];

  //news
  const [isLoaded, setIsLoaded] = useState(false);
  const [news, setNews] = useState(false);
  const [page, setPage] = useState(pageFirst);
  const [curCategory, setCurCategory] = useState(all);
  const [curEndpoint, setCurEndpoint] = useState(everything);
  const [sources, setSources] = useState(undefined);

  // date
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [curDate, setCurDate] = useState("");
  const [mode, setMode] = useState(modeDate);
  const [show, setShow] = useState(false);

  //search
  const searchInput = useRef(null);
  const [input, setInput] = useState(undefined);

  const onChange = (selectedDate) => {
    const currentDate = selectedDate || new Date();
    setShow(Platform.OS === "ios");
    switch (curDate) {
      case dateFrom:
        setFromDate(currentDate);
        break;
      case dateTo:
        setToDate(currentDate);
        break;
    }
  };

  const showMode = (currentMode) => {
    setShow(true);
    setMode(currentMode);
  };

  const showDatepicker = (date) => {
    switch (date) {
      case dateFrom:
        setCurDate(dateFrom);
        break;
      case dateTo:
        setCurDate(dateTo);
        break;
    }
    showMode(modeDate);
  };

  const parseDate = (date) => {
    let tmpDate = date;
    tmpDate = tmpDate.toLocaleDateString().split(dateSeparator);
    tmpDate = `20${tmpDate[2]}-${tmpDate[0]}-${tmpDate[1]}`;
    return tmpDate;
  };

  const createUrl = ({
    endpoint,
    q,
    from,
    to,
    domains,
    category,
    page,
    pageSize,
    country,
    apiKey,
  }) => {
    const tmpfrom = parseDate(from);
    const tmpto = parseDate(to);
    switch (endpoint) {
      case everything:
        if (q) {
          return `https://newsapi.org/v2/${everything}?q=${q}&from=${tmpfrom}to=${tmpto}&domains=${domains}&page=${page}&pageSize=${pageSize}&apiKey=${apiKey}`;
        }
        return `https://newsapi.org/v2/${everything}?q=&from=${from.toUTCString()}to=${to.toUTCString()}&domains=${domains}&page=${page}&pageSize=${pageSize}&apiKey=${apiKey}`;
      case topHeadlines:
        return `https://newsapi.org/v2/${topHeadlines}?category=${category}&page=${page}&pageSize=${pageSize}&country=${country}&apiKey=${apiKey}`;
      case sources:
        break;
      default:
        break;
    }
  };

  const createPromis = (url) => {
    const req = new Request(url);
    return fetch(req);
  };

  //Переход по ссылки
  const OpenURLButton = ({ url, children }) => {
    const handlePress = useCallback(async () => {
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(`Don't know how to open this URL: ${url}`);
      }
    }, [url]);

    return <Button title={children} onPress={handlePress} />;
  };

  //Карточка новости
  const NewsItem = ({ title, urlToImage, description, url, publishedAt }) => (
    <Card>
      <Card.Title>{title}</Card.Title>
      <Card.Divider />

      <Card.Image
        source={{
          uri: urlToImage
            ? urlToImage
            : "https://image.shutterstock.com/image-vector/vector-electric-plug-socket-unplugged-260nw-1188619804.jpg",
        }}
      />
      <Card.Divider />
      <Text style={{ marginBottom: 10 }}>{description}</Text>
      <Card.Divider />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {url ? <OpenURLButton url={url}>Открыть</OpenURLButton> : null}
        <Text>{publishedAt}</Text>
      </View>
    </Card>
  );

  const renderNewsItem = ({ item }) => (
    <NewsItem
      title={item[newsTitle]}
      urlToImage={item[newsUrlToImage]}
      description={item[newsDescription]}
      url={item[newsUrl]}
      publishedAt={item[newsPublishedAt]}
    />
  );

  //Пункт категорий
  const Item = ({ nameCategory, category }) => (
    <View style={styles.item}>
      <Button
        title={nameCategory}
        style={styles.title}
        onPress={setNewCategory.bind(null, category)}
      />
    </View>
  );

  const renderItem = ({ item }) => (
    <Item nameCategory={item.nameCategory} category={item.category} />
  );

  const categoriesClick = (e) => {
    setCategoriesVisible(!categoriesVisible);
  };

  const visibleClass = categoriesVisible ? styles.open : styles.close;

  //Получение новостей
  const getNews = async (
    endpoint = everything,
    q = "",
    category = general,
    page = 1,
    pageSize = 10,
    country ,
    apiKey = key,
  ) => {
    const url = createUrl(
      endpoint,
      q,
      category,
      page,
      pageSize,
      country,
      apiKey,
    );

    console.log(url)
    const promisNews = createPromis(url);
    const res = await promisNews;
    const data = await res.json();
    console.log(requestStatus, data.status);
    console.log("data", data);
    if (data.status === requestError) {
      console.log(requestMessage, data.message);
      return false;
    }
    return data;
  };

  //Фильтрация по категориям
  const setNewCategory = (newCategory) => {
    categoriesClick();
    setCurCategory(newCategory);
    setPage(pageFirst);
    setInput(undefined);

    if (newCategory === all) {
      getNews({
        endpoint: everything,
        category: curCategory,
        domains: sources,
        from: new Date(),
        to: new Date(),
        page: pageFirst,
        pageSize: size,
        country: country,
        apiKey: key,
      }).then((data) => setNews(data));
      setCurEndpoint(everything);
      setFromDate(new Date());
      setToDate(new Date());
    } else {
      getNews({
        endpoint: topHeadlines,
        category: newCategory,
        from: fromDate,
        to: toDate,
        page: pageFirst,
        pageSize: size,
        country: country,
        apiKey: key,
      }).then((data) => setNews(data));
      setCurEndpoint(topHeadlines);
    }
  };

  //Функционал поиска по ключ. слову
  const searching = () => {
    setCurCategory(all);
    setPage(pageFirst);
    getNews({
      endpoint: everything,
      category: curCategory,
      q: input,
      from: fromDate,
      to: toDate,
      domains: sources,
      page: page,
      pageSize: size,
      country: country,
      apiKey: key,
    }).then((data) => {
      setNews(data);
    });
    setCurEndpoint(everything);
  };

  //Получение новостных источников из бд
  const getSources = () => {
    return new Promise((resolve, reject) => {
      db.findOne({ db: dbSetting }, function (err, doc) {
        if (doc !== null) {
          const sources = [];

          doc[dbCountries][doc[dbDefaultCountry]].forEach((el) => {
            if (el[sourceIsEnabled]) {
              sources.push(el[sourceName]);
            }
          });
          console.log(doc[dbDefaultCountry]);
          console.log(sources);
          setCountry(doc[dbDefaultCountry]);
          resolve({ sources: sources, country: doc[dbDefaultCountry] });
        } else {
          reject();
        }
      });
    });
  };

  const [isRequest, setIsRequest] = useState(false);

  useEffect(() => {
    if (!isRequest && !isLoaded) {
      setIsRequest(true);
      getSources().then(({ sources, country }) => {
        getNews({
          endpoint: curEndpoint,
          category: curCategory,
          domains: sources,
          from: fromDate,
          to: toDate,
          page: page,
          pageSize: size,
          country: country,
          apiKey: key,
        }).then((data) => {
          setNews(data);
          setSources(sources);
          setCountry(country);
          setIsRequest(false);
          setIsLoaded(true);
        });
      });
    }
  }, [isLoaded]);

  const [refreshing, setRefreshing] = useState(false);

  //Обновление новостей
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (!isRequest) {
      setIsRequest(true);
      getSources().then(({ sources, country }) => {
        getNews({
          endpoint: curEndpoint,
          category: curCategory,
          domains: sources,
          from: fromDate,
          to: toDate,
          page: page,
          pageSize: size,
          country: country,
          apiKey: key,
        }).then((data) => {
          setNews(data);
          setSources(sources);
          setCountry(country);
          setIsRequest(false);
          setRefreshing(false);
        });
      });
    }
  }, [refreshing]);

  return (
    <View style={styles.container}>
      <Text style={{ display: "none" }}>{sources}</Text>

      <FlatList
        style={[styles.menu, visibleClass]}
        data={categories}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
      />

      {show && (
        <DateTimePicker
          value={curDate === dateFrom ? fromDate : toDate}
          mode={mode}
          is24Hour={true}
          display="default"
          onChange={onChange}
        />
      )}

      <View style={styles.filter}>
        <View style={styles.categories}>
          <Text>
            {
              categories.filter((v) => v.category === curCategory)[0]
                .nameCategory
            }
          </Text>
          <Button title={btnCategories} onPress={categoriesClick} />
        </View>

        <View style={styles.searchForm}>
          <TextInput
            ref={searchInput}
            onChangeText={(text) => setInput(text)}
            value={input}
            style={styles.searchInput}
          />
          <Button
            onPress={showDatepicker.bind(null, dateFrom)}
            title={`от ${
              fromDate.toLocaleDateString().split(dateSeparator)[1]
            }-${fromDate.toLocaleDateString().split(dateSeparator)[0]}`}
          />
          <Button
            onPress={showDatepicker.bind(null, dateTo)}
            title={`до ${toDate.toLocaleDateString().split(dateSeparator)[1]}-${
              toDate.toLocaleDateString().split(dateSeparator)[0]
            }`}
          />
          <Button onPress={searching} title={btnSearch} />
        </View>
      </View>

      <View style={styles.content}>
        {news && news[articles].length ? (
          <FlatList
            ref={newsList}
            data={news[articles]}
            renderItem={renderNewsItem}
            keyExtractor={(item, index) => index.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            onEndReached={() => {
              if (news.totalResults > page * size) {
                getSources().then((sources) => {
                  getNews({
                    endpoint: curEndpoint,
                    category: curCategory,
                    q: input,
                    from: fromDate,
                    to: toDate,
                    domains: sources,
                    page: page + 1,
                    pageSize: size,
                    country: country,
                    apiKey: key,
                  }).then((data) => {
                    const newNews = news;
                    newNews[articles].push(...data[articles]);
                    setNews(newNews);
                    setPage(page + 1);
                    newsList.current.scrollToIndex({
                      animated: false,
                      index: page * 7,
                    });
                  });
                });
              }
            }}
          />
        ) : (
          <FlatList
            data={plug}
            renderItem={renderNewsItem}
            keyExtractor={(item, index) => index.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 10,
    flexDirection: "column",
    zIndex: 1,
  },
  filter: {
    flexDirection: "column",
  },
  open: {
    position: "absolute",
    display: "flex",
  },
  close: {
    display: "none",
  },
  menu: {
    width: 200,
    top: 35,
    right: 0,
    backgroundColor: "#fff",
    zIndex: 2,
  },
  content: {
    zIndex: 1,
  },
  loading: {
    justifyContent: "center",
  },
  searchForm: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  searchInput: {
    width: "50%",

    borderWidth: 1,
    borderColor: "#c4c4c4ff",
    borderRadius: 5,
  },
  categories: {
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "pink",
    alignItems: "center",
    justifyContent: "center",
  },
});
